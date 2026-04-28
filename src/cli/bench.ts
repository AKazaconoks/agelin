/**
 * `agelin bench` — full pipeline: static rules + dynamic eval.
 *
 * Calls Agent C's `runBenchmark` to actually exercise each subagent against
 * the golden task suite, then folds the results into AgentScores via
 * `computeAgentScore` (also Agent C). Static issues are still computed
 * up-front so a benchmark run is always a strict superset of a check run.
 *
 * Sprint 2 additions:
 *   - File cache pre-pass: triples already on disk skip the runner entirely.
 *   - ProgressTracker drives a streaming TTY UI on stderr (so stdout JSON is
 *     unaffected when --format=json).
 *   - Summary block printed after the bench completes.
 *
 * Sprint 3 additions:
 *   - `--backend=api|claude-code|auto` flag selects between the direct
 *     Anthropic API and the local `claude` CLI subprocess. `auto` (default)
 *     prefers claude-code when the binary is on PATH and ANTHROPIC_API_KEY
 *     is missing — making the bench free for users on a Claude Code Max
 *     subscription. See src/eval/backends/.
 *
 * NOTE for Agent E: when the multi-turn runner lands, please accept a
 * ProgressTracker via `RunBenchmarkOpts.tracker` and emit `runStart` /
 * `runEnd` per (agent, task, repeat) so the UI updates live instead of in
 * one big batch at the end. The tracker shape is exported from
 * `../eval/progress.js`.
 *
 * Sprint-3 note for baseline.ts (Agent G): read --backend flag the same way
 * (via parseBackendArg) and pass it to runBenchmark via opts.backend.
 *
 * Requires ANTHROPIC_API_KEY in the environment when --backend=api. The
 * claude-code backend bypasses the API key requirement.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadConfig } from "../config.js";
import { saveLastRun } from "../persistence.js";
import { getReporter } from "../reporters/index.js";
import { ALL_RULES } from "../rules/index.js";
import { parseSubagentDir } from "../parser/parse.js";
import { runBenchmark } from "../eval/runner.js";
import { pickBackend, type BackendId } from "../eval/backends/index.js";
import { computeAgentScore } from "../scoring/score.js";
import {
  cacheKey,
  getCached,
  putCached,
  type CacheKey,
} from "../eval/cache.js";
import {
  ProgressTracker,
  makeRunId,
  type ProgressSnapshot,
} from "../eval/progress.js";
import type {
  AgentScore,
  GoldenTask,
  Issue,
  ParsedSubagent,
  ReportContext,
  Rule,
  RunResult,
  Severity,
  SubagentLintConfig,
  TaskCategory,
} from "../types.js";

export interface BenchOptions {
  path: string;
  format: string;
  configPath?: string;
  /** Skip the on-disk cache (force fresh API calls). */
  noCache?: boolean;
  /** Backend selection: "api", "claude-code", or "auto". Default "auto". */
  backend?: BackendId | "auto";
  /** Override config.benchRepeats from the CLI. */
  repeats?: number;
  /**
   * Optional file path to write the report output to. Bypasses stdout
   * entirely. Useful in CI and for long-running benches where the
   * stdout pipe buffer can get lost on Windows when the result is
   * large (~500KB+). When set, console.log is skipped.
   */
  outputFile?: string;
}

// ---------------------------------------------------------------------------
// Sprint-3 argv shim.
//
// The shared parseArgs in cli.ts runs in strict mode and we are not allowed
// to modify it. To still let users pass `--backend=...`, we strip the flag
// out of `process.argv` at module load (which happens before cli.ts calls
// parseArgs in `main`) and stash the parsed value here. The `runBench` call
// reads it and threads it through to `runBenchmark`.
//
// Also accepts the SUBAGENT_LINT_BACKEND env var as a fallback / override
// so CI scripts and Agent G's baseline.ts can opt in without monkeying with
// argv parsing.
const PRESELECTED_BACKEND: BackendId | "auto" | undefined =
  parseBackendFromArgv();
const PRESELECTED_REPEATS: number | undefined = parseRepeatsFromArgv();

function parseRepeatsFromArgv(): number | undefined {
  const argv = process.argv;
  for (let i = argv.length - 1; i >= 2; i--) {
    const a = argv[i];
    if (typeof a !== "string") continue;
    let raw: string | undefined;
    if (a.startsWith("--repeats=")) {
      raw = a.slice("--repeats=".length);
      argv.splice(i, 1);
    } else if (a === "--repeats") {
      raw = argv[i + 1];
      argv.splice(i, raw === undefined ? 1 : 2);
    } else {
      continue;
    }
    const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

function parseBackendFromArgv(): BackendId | "auto" | undefined {
  const argv = process.argv;
  let found: BackendId | "auto" | undefined;
  for (let i = argv.length - 1; i >= 2; i--) {
    const a = argv[i];
    if (typeof a !== "string") continue;
    if (a.startsWith("--backend=")) {
      const raw = a.slice("--backend=".length);
      if (isValidBackend(raw)) found = raw;
      argv.splice(i, 1);
      continue;
    }
    if (a === "--backend") {
      const raw = argv[i + 1];
      if (isValidBackend(raw)) found = raw;
      // Remove flag and value (if present) so parseArgs doesn't see them.
      argv.splice(i, raw === undefined ? 1 : 2);
      continue;
    }
  }
  if (found !== undefined) return found;
  const env = process.env.SUBAGENT_LINT_BACKEND;
  if (env !== undefined && isValidBackend(env)) return env;
  return undefined;
}

function isValidBackend(raw: unknown): raw is BackendId | "auto" {
  return raw === "api" || raw === "claude-code" || raw === "auto";
}

const TOOL_VERSION = "0.0.1";
const TASKS_DIR = "tasks";
const DEFAULT_CATEGORIES: TaskCategory[] = ["code-review", "research", "debug"];

function effectiveSeverity(rule: Rule, config: SubagentLintConfig): Severity | "off" {
  const override = config.rules?.[rule.id];
  if (override === undefined) return rule.defaultSeverity;
  return override;
}

function applySeverityOverride(issue: Issue, override: Severity): Issue {
  if (issue.severity === override) return issue;
  return { ...issue, severity: override };
}

function runRulesOnAgent(
  subagent: ParsedSubagent,
  rules: Rule[],
  config: SubagentLintConfig,
): Issue[] {
  const issues: Issue[] = [];
  for (const rule of rules) {
    const sev = effectiveSeverity(rule, config);
    if (sev === "off") continue;
    let ruleIssues: Issue[] = [];
    try {
      ruleIssues = rule.check(subagent);
    } catch (err) {
      ruleIssues = [
        {
          ruleId: rule.id,
          severity: "warning",
          message: `Rule ${rule.id} threw: ${err instanceof Error ? err.message : String(err)}`,
        },
      ];
    }
    for (const issue of ruleIssues) {
      issues.push(applySeverityOverride(issue, sev));
    }
  }
  for (const parseError of subagent.parseErrors) {
    issues.push({
      ruleId: "parse-error",
      severity: "error",
      message: parseError,
    });
  }
  return issues;
}

/**
 * Load golden tasks from `tasks/<category>/*.json`. Each file is expected to
 * be a single GoldenTask object. Skips files that fail to parse rather than
 * aborting the whole run.
 */
function loadGoldenTasks(categories: TaskCategory[]): GoldenTask[] {
  const root = resolve(process.cwd(), TASKS_DIR);
  if (!existsSync(root)) return [];
  const tasks: GoldenTask[] = [];
  for (const category of categories) {
    const dir = join(root, category);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (!entry.endsWith(".json")) continue;
      const filePath = join(dir, entry);
      try {
        const raw = readFileSync(filePath, "utf8");
        const parsed = JSON.parse(raw) as GoldenTask;
        tasks.push(parsed);
      } catch (err) {
        console.error(
          `Warning: failed to parse task ${filePath}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
  return tasks;
}

export async function runBench(opts: BenchOptions): Promise<void> {
  // Choose the backend up-front so we can decide whether we even need an API
  // key. The CLI flag `--backend=...` (stripped from argv at module load via
  // parseBackendFromArgv) wins over `opts.backend` wins over the env var.
  const preferred: BackendId | "auto" =
    opts.backend ?? PRESELECTED_BACKEND ?? "auto";
  const backend = await pickBackend(preferred);

  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (backend.id === "api" && !apiKey) {
    console.error(
      "ANTHROPIC_API_KEY is required for the `api` backend — set it in your environment and retry,",
    );
    console.error(
      "or pass `--backend=claude-code` to route through your local Claude Code subscription instead.",
    );
    console.error("(Use `agelin check` for a static-only run that needs neither.)");
    process.exit(1);
  }

  if (backend.id === "claude-code") {
    process.stderr.write(
      "Using claude-code backend (local CLI subprocess; no API key required).\n",
    );
  }

  const config = loadConfig(opts.configPath);
  const reporter = getReporter(opts.format);

  const subagents = await parseSubagentDir(opts.path);

  // Static issues per agent, keyed by name (with path fallback)
  const staticIssuesByAgent = new Map<string, Issue[]>();
  for (const subagent of subagents) {
    const issues = runRulesOnAgent(subagent, ALL_RULES, config);
    const key = subagent.frontmatter.name || subagent.path;
    staticIssuesByAgent.set(key, issues);
  }

  const categories = config.benchCategories ?? DEFAULT_CATEGORIES;
  const tasks = loadGoldenTasks(categories);
  if (tasks.length === 0) {
    console.error(
      `Warning: no golden tasks found under ./${TASKS_DIR}/ for categories ${categories.join(", ")}. Continuing with static-only scores.`,
    );
  }

  const repeats = Math.max(
    1,
    opts.repeats ?? PRESELECTED_REPEATS ?? config.benchRepeats ?? 1,
  );
  const model = config.benchModel ?? "claude-sonnet-4-6";
  const totalTriples = subagents.length * tasks.length * repeats;

  // Wire up progress tracker + renderer.
  const tracker = new ProgressTracker();
  const renderer = createProgressRenderer(opts.format);
  renderer.attach(tracker);

  let runResults: RunResult[] = [];
  if (tasks.length > 0) {
    tracker.start(totalTriples);

    // Cache pre-pass: pull triples whose results are already on disk.
    const { cachedResults, missingAgents, missingTasks, missingRepeats } =
      await partitionByCache({
        subagents,
        tasks,
        repeats,
        model,
        skipCache: opts.noCache === true,
        tracker,
      });

    // Run only the misses.
    if (missingAgents.length > 0 && missingTasks.length > 0) {
      // Pre-build the agent-body map so the onResult callback can compute
      // cache keys per-run without re-parsing.
      const agentBodyByName = new Map<string, string>();
      for (const a of missingAgents) {
        agentBodyByName.set(a.frontmatter.name || a.path, a.raw);
      }
      const taskById = new Map<string, GoldenTask>();
      for (const t of missingTasks) taskById.set(t.id, t);

      const fresh = await runBenchmark(missingAgents, missingTasks, {
        apiKey,
        model,
        repeats: missingRepeats,
        backend,
        // Pass the tracker so runStart/runEnd fire LIVE per (agent, task,
        // repeat) instead of in one batch at the end.
        tracker,
        // Save each result to disk the moment it lands so a long benchmark
        // can survive being killed mid-flight.
        onResult: opts.noCache === true
          ? undefined
          : async (result, agent, task, repeat) => {
              const key = cacheKey({
                agentBody: agent.raw,
                task,
                model,
                repeat,
              });
              await putCached(key, result);
            },
      });

      runResults = [...cachedResults, ...fresh];
    } else {
      runResults = cachedResults;
    }

    tracker.finish();
    renderer.detach();
  }

  // Group RunResults by agent name
  const resultsByAgent = new Map<string, RunResult[]>();
  for (const r of runResults) {
    const list = resultsByAgent.get(r.agentName);
    if (list) list.push(r);
    else resultsByAgent.set(r.agentName, [r]);
  }

  const results: AgentScore[] = subagents.map((subagent) => {
    const key = subagent.frontmatter.name || subagent.path;
    const issues = staticIssuesByAgent.get(key) ?? [];
    const benchResults = resultsByAgent.get(key) ?? [];
    return computeAgentScore(subagent, issues, benchResults);
  });

  const ctx: ReportContext = {
    results,
    generatedAt: new Date().toISOString(),
    toolVersion: TOOL_VERSION,
  };

  // Print bench summary to stderr so JSON stdout stays clean.
  if (tasks.length > 0) {
    printSummary(tracker.snapshot(), results);
  }

  const output = reporter.render(ctx);
  if (opts.outputFile) {
    // Direct file write — sidesteps the Windows stdout-pipe-buffer-loss
    // bug that's bitten us when bench runs produce large JSON.
    const { writeFileSync } = await import("node:fs");
    writeFileSync(opts.outputFile, output, "utf8");
    process.stderr.write(`Wrote ${output.length} bytes to ${opts.outputFile}\n`);
  } else {
    console.log(output);
  }

  try {
    saveLastRun(ctx);
  } catch (err) {
    console.error(
      `Warning: failed to save last run: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const hasErrors = results.some((r) =>
    r.staticIssues.some((i) => i.severity === "error"),
  );
  if (hasErrors) {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Cache pre-pass

interface PartitionInput {
  subagents: ParsedSubagent[];
  tasks: GoldenTask[];
  repeats: number;
  model: string;
  skipCache: boolean;
  tracker: ProgressTracker;
}

interface PartitionOutput {
  cachedResults: RunResult[];
  missingAgents: ParsedSubagent[];
  missingTasks: GoldenTask[];
  missingRepeats: number;
}

/**
 * Walk every (agent, task, repeat) triple and try to satisfy it from cache.
 * Anything left over is bundled into a fresh-run input set. Because the
 * existing runner takes a "matrix" of (agents x tasks x repeats), we have to
 * conservatively pass through any agent or task that has *any* miss — but we
 * trim the matrix down to those agents/tasks/repeats so we don't pay for
 * triples already on disk.
 *
 * TODO(Agent E): once the runner accepts a flat list of triples, partition
 * exactly. Today's behavior is: if (A, T) has 1/3 cache hits we re-run all 3
 * for that pair (and overwrite the disk entries). Mild inefficiency, no
 * correctness impact.
 */
async function partitionByCache(input: PartitionInput): Promise<PartitionOutput> {
  const { subagents, tasks, repeats, model, skipCache, tracker } = input;

  if (skipCache) {
    return {
      cachedResults: [],
      missingAgents: subagents,
      missingTasks: tasks,
      missingRepeats: repeats,
    };
  }

  const cachedResults: RunResult[] = [];
  const agentNeedsRun = new Set<string>();
  const taskNeedsRun = new Set<string>();

  for (const agent of subagents) {
    for (const task of tasks) {
      let pairAllHit = true;
      const pairResults: RunResult[] = [];
      for (let r = 0; r < repeats; r++) {
        const key: CacheKey = cacheKey({
          agentBody: agent.raw,
          task,
          model,
          repeat: r,
        });
        const hit = await getCached(key);
        if (hit) {
          pairResults.push(hit);
        } else {
          pairAllHit = false;
          break;
        }
      }
      if (pairAllHit && pairResults.length === repeats) {
        for (let r = 0; r < pairResults.length; r++) {
          const result = pairResults[r]!;
          const runId = makeRunId(result.agentName, result.taskId, r);
          tracker.cacheHit({
            runId,
            agentName: result.agentName,
            taskId: result.taskId,
            repeat: r,
            totalRepeats: repeats,
            result,
          });
          cachedResults.push(result);
        }
      } else {
        agentNeedsRun.add(agent.frontmatter.name || agent.path);
        taskNeedsRun.add(task.id);
      }
    }
  }

  const missingAgents = subagents.filter((a) =>
    agentNeedsRun.has(a.frontmatter.name || a.path),
  );
  const missingTasks = tasks.filter((t) => taskNeedsRun.has(t.id));

  return {
    cachedResults,
    missingAgents,
    missingTasks,
    missingRepeats: repeats,
  };
}

async function persistFreshResults(
  fresh: RunResult[],
  agents: ParsedSubagent[],
  tasks: GoldenTask[],
  model: string,
): Promise<void> {
  const agentByName = new Map<string, ParsedSubagent>();
  for (const a of agents) agentByName.set(a.frontmatter.name || a.path, a);
  const taskById = new Map<string, GoldenTask>();
  for (const t of tasks) taskById.set(t.id, t);

  for (const result of fresh) {
    const agent = agentByName.get(result.agentName);
    const task = taskById.get(result.taskId);
    if (!agent || !task) continue;
    const key = cacheKey({ agentBody: agent.raw, task, model });
    try {
      await putCached(key, result);
    } catch (err) {
      console.error(
        `Warning: failed to cache result for ${result.agentName}/${result.taskId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Progress rendering

interface ProgressRenderer {
  attach(tracker: ProgressTracker): void;
  detach(): void;
}

function createProgressRenderer(format: string): ProgressRenderer {
  // When the user wants JSON to stdout, we still render to stderr — but if
  // stderr isn't a TTY we fall back to one log line per completed run.
  const isTty = !!process.stderr.isTTY;
  const enableAnsi = isTty;
  return enableAnsi ? new TtyProgressRenderer(format) : new LogProgressRenderer();
}

class LogProgressRenderer implements ProgressRenderer {
  private tracker: ProgressTracker | null = null;
  private handlers: Array<[string, (...args: any[]) => void]> = [];

  attach(tracker: ProgressTracker): void {
    this.tracker = tracker;
    const onStart = (info: { total: number }) => {
      process.stderr.write(`Benchmarking ${info.total} runs\n`);
    };
    const onCacheHit = (info: { agentName: string; taskId: string; repeat: number }) => {
      process.stderr.write(
        `  cached: ${info.agentName} / ${info.taskId} (run ${info.repeat + 1})\n`,
      );
    };
    const onRunEnd = (info: { agentName: string; taskId: string; repeat: number; result: RunResult }) => {
      const tag = info.result.success ? "ok" : "FAIL";
      const line = `  ${tag}: ${info.agentName} / ${info.taskId} (run ${info.repeat + 1}) $${info.result.costUsd.toFixed(4)}\n`;
      process.stderr.write(line);
      // Also append to a side-file so the line is visible immediately when
      // stderr is redirected (Windows stderr is fully-buffered when piped).
      try {
        const path = process.env.SUBAGENT_LINT_PROGRESS_FILE;
        if (path) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require("node:fs").appendFileSync(path, line, "utf8");
        }
      } catch {
        /* ignore — visibility is best-effort */
      }
    };
    tracker.on("start", onStart);
    tracker.on("cacheHit", onCacheHit);
    tracker.on("runEnd", onRunEnd);
    this.handlers = [
      ["start", onStart],
      ["cacheHit", onCacheHit],
      ["runEnd", onRunEnd],
    ];
  }

  detach(): void {
    if (!this.tracker) return;
    for (const [name, fn] of this.handlers) {
      this.tracker.off(name, fn);
    }
    this.tracker = null;
    this.handlers = [];
  }
}

class TtyProgressRenderer implements ProgressRenderer {
  private tracker: ProgressTracker | null = null;
  private handlers: Array<[string, (...args: any[]) => void]> = [];
  private linesWritten = 0;
  private readonly _format: string;

  constructor(format: string) {
    this._format = format;
  }

  attach(tracker: ProgressTracker): void {
    this.tracker = tracker;

    const render = () => this.render();

    const onStart = (info: { total: number }) => {
      process.stderr.write(
        `Benchmarking ${info.total} runs (format=${this._format})\n`,
      );
      this.linesWritten = 0;
      render();
    };
    const onAny = () => render();
    const onDone = () => {
      this.clear();
      const snap = tracker.snapshot();
      process.stderr.write(
        `Done: ${snap.completed}/${snap.total} runs, ${snap.cached} cached, ${snap.failed} failed, $${snap.costUsd.toFixed(4)} spent in ${formatDuration(snap.elapsedMs)}\n`,
      );
    };

    tracker.on("start", onStart);
    tracker.on("runStart", onAny);
    tracker.on("runEnd", onAny);
    tracker.on("cacheHit", onAny);
    tracker.on("done", onDone);
    this.handlers = [
      ["start", onStart],
      ["runStart", onAny],
      ["runEnd", onAny],
      ["cacheHit", onAny],
      ["done", onDone],
    ];
  }

  detach(): void {
    if (!this.tracker) return;
    for (const [name, fn] of this.handlers) {
      this.tracker.off(name, fn);
    }
    this.tracker = null;
    this.handlers = [];
  }

  private clear(): void {
    if (this.linesWritten === 0) return;
    // Move cursor up `linesWritten` and clear each line.
    for (let i = 0; i < this.linesWritten; i++) {
      process.stderr.write("\x1b[A\x1b[2K");
    }
    this.linesWritten = 0;
  }

  private render(): void {
    if (!this.tracker) return;
    this.clear();
    const snap = this.tracker.snapshot();
    const lines = renderProgressLines(snap);
    for (const line of lines) {
      process.stderr.write(line + "\n");
    }
    this.linesWritten = lines.length;
  }
}

function renderProgressLines(snap: ProgressSnapshot): string[] {
  const width = 24;
  const ratio = snap.total > 0 ? snap.completed / snap.total : 0;
  const filled = Math.min(width, Math.round(ratio * width));
  const bar = "=".repeat(Math.max(0, filled - 1)) + (filled > 0 && filled < width ? ">" : (filled === width ? "=" : ""));
  const padded = bar.padEnd(width, " ");
  const eta = estimateEta(snap);
  const lines: string[] = [];
  lines.push(
    `[${padded}] ${snap.completed}/${snap.total} (${snap.cached} cached) $${snap.costUsd.toFixed(2)} spent  ETA ${eta}`,
  );
  const running = snap.currentRuns.slice(0, 3);
  if (running.length > 0) {
    lines.push(`running: ${formatRunId(running[0]!)}`);
    for (let i = 1; i < running.length; i++) {
      lines.push(`         ${formatRunId(running[i]!)}`);
    }
  } else {
    lines.push("running: (queue draining)");
  }
  return lines;
}

function formatRunId(runId: string): string {
  const [agent, task, repeatStr] = runId.split("::");
  const repeat = Number.parseInt(repeatStr ?? "0", 10);
  return `${agent} / ${task} (run ${Number.isFinite(repeat) ? repeat + 1 : "?"})`;
}

function estimateEta(snap: ProgressSnapshot): string {
  if (snap.completed === 0 || snap.total === 0) return "--";
  const remaining = snap.total - snap.completed;
  if (remaining <= 0) return "0s";
  const perRun = snap.elapsedMs / snap.completed;
  return formatDuration(remaining * perRun);
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "--";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  if (min < 60) return `${min}m ${remSec}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

// ---------------------------------------------------------------------------
// Summary block

function printSummary(snap: ProgressSnapshot, results: AgentScore[]): void {
  const cachePct = snap.total > 0 ? (snap.cached / snap.total) * 100 : 0;
  process.stderr.write("\n");
  process.stderr.write("Bench summary\n");
  process.stderr.write("=============\n");
  process.stderr.write(`Total runs:      ${snap.completed}/${snap.total}\n`);
  process.stderr.write(`Cache hits:      ${snap.cached} (${cachePct.toFixed(1)}%)\n`);
  process.stderr.write(`Failed runs:     ${snap.failed}\n`);
  process.stderr.write(`Total cost:      $${snap.costUsd.toFixed(4)}\n`);
  process.stderr.write(`Wall time:       ${formatDuration(snap.elapsedMs)}\n`);

  if (results.length === 0) return;

  const sorted = [...results].sort((a, b) => b.score - a.score);
  const meanScore =
    sorted.reduce((acc, r) => acc + r.score, 0) / sorted.length;
  process.stderr.write(`Mean per-agent:  ${meanScore.toFixed(1)}\n`);

  const top = sorted.slice(0, 3);
  const bottom = sorted.slice(-3).reverse();
  process.stderr.write("\nTop 3:\n");
  for (const r of top) {
    process.stderr.write(`  ${r.agentName.padEnd(30)} ${r.score.toFixed(1)}\n`);
  }
  if (sorted.length > 3) {
    process.stderr.write("\nBottom 3:\n");
    for (const r of bottom) {
      process.stderr.write(`  ${r.agentName.padEnd(30)} ${r.score.toFixed(1)}\n`);
    }
  }
  process.stderr.write("\n");
}
