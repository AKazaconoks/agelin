/**
 * `agelin baseline` — sweep every scraped target subagent through the
 * full static + dynamic pipeline and emit a launch-ready leaderboard.
 *
 * Outputs:
 *   - leaderboard.json   canonical artifact (schema in leaderboard/generate.ts)
 *   - leaderboard.md     top-20 markdown table for quick paste-into-PR
 *   - .agelin/last-baseline.json   full result set for the report cmd
 *
 * Stdout: a human summary (total runs, total cost, top/bottom 5, mean score).
 * Stderr: progress + warnings.
 *
 * This is a thin orchestration layer over the existing pipeline:
 *   parser -> static rules -> runBenchmark -> computeAgentScore -> generateLeaderboard
 *
 * It deliberately reuses the same primitives as `bench.ts` so the scoring
 * stays consistent across both commands.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { loadConfigWithPlugins } from "../config.js";
import { runRulesOnAgent } from "../lint-runner.js";
import { parseSubagentDir } from "../parser/parse.js";
import { runBenchmark } from "../eval/runner.js";
import { computeAgentScore } from "../scoring/score.js";
import {
  generateLeaderboard,
  type LeaderboardData,
  type Manifest,
} from "../leaderboard/generate.js";
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

export interface BaselineOptions {
  /** Root of `targets/` (default: ./targets). */
  targetsDir?: string;
  /** Output format echoed in stdout summary (default: console). */
  format?: string;
  configPath?: string;
  /** Selects an eval backend; reserved for Agent H. Currently unused. */
  backend?: string;
  /** Override config.benchModel. */
  model?: string;
  /** Override config.benchRepeats. */
  repeats?: number;
}

const TOOL_VERSION = readToolVersion();
const TASKS_DIR = "tasks";
const DEFAULT_CATEGORIES: TaskCategory[] = ["code-review", "research", "debug"];
const TARGETS_DEFAULT = "targets";
const MANIFEST_FILE = "manifest.json";
const LAST_BASELINE_DIR = ".agelin";
const LAST_BASELINE_FILE = "last-baseline.json";

function readToolVersion(): string {
  try {
    const pkgPath = resolve(process.cwd(), "package.json");
    if (existsSync(pkgPath)) {
      const raw = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
      if (typeof raw.version === "string" && raw.version.length > 0) {
        return raw.version;
      }
    }
  } catch {
    // fall through
  }
  return "0.0.0";
}

export async function runBaseline(opts: BaselineOptions = {}): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "ANTHROPIC_API_KEY is required for `baseline` — set it in your environment and retry.",
    );
    process.exit(1);
  }

  const { config, rules } = await loadConfigWithPlugins(opts.configPath);
  const targetsDir = resolve(process.cwd(), opts.targetsDir ?? TARGETS_DEFAULT);

  if (!existsSync(targetsDir)) {
    console.error(`Targets dir not found: ${targetsDir}`);
    process.exit(1);
  }

  const manifest = loadManifest(targetsDir);
  if (!manifest) {
    console.error(
      `Warning: no manifest.json under ${targetsDir} — leaderboard rows will lack repo/license metadata.`,
    );
  }

  const subagents = collectTargetSubagents(targetsDir);
  if (subagents.length === 0) {
    console.error(`No subagents found under ${targetsDir}`);
    process.exit(1);
  }
  process.stderr.write(
    `Loaded ${subagents.length} target subagents from ${targetsDir}\n`,
  );

  // Static issues per agent.
  const staticIssuesByAgent = new Map<string, Issue[]>();
  for (const sub of subagents) {
    const issues = runRulesOnAgent(sub, rules, config);
    const key = sub.frontmatter.name || sub.path;
    staticIssuesByAgent.set(key, issues);
  }

  const categories = config.benchCategories ?? DEFAULT_CATEGORIES;
  const tasks = loadGoldenTasks(categories);
  if (tasks.length === 0) {
    console.error(
      `Warning: no golden tasks found under ./${TASKS_DIR}/ — leaderboard will reflect static health only.`,
    );
  }

  const repeats = Math.max(1, opts.repeats ?? config.benchRepeats ?? 1);
  const model = opts.model ?? config.benchModel ?? "claude-sonnet-4-6";

  let runResults: RunResult[] = [];
  if (tasks.length > 0) {
    process.stderr.write(
      `Running ${subagents.length} agents x ${tasks.length} tasks x ${repeats} repeats = ${subagents.length * tasks.length * repeats} runs (model=${model})\n`,
    );
    runResults = await runBenchmark(subagents, tasks, {
      apiKey,
      model,
      repeats,
    });
  }

  const resultsByAgent = new Map<string, RunResult[]>();
  for (const r of runResults) {
    const list = resultsByAgent.get(r.agentName);
    if (list) list.push(r);
    else resultsByAgent.set(r.agentName, [r]);
  }

  const scores: AgentScore[] = subagents.map((sub) => {
    const key = sub.frontmatter.name || sub.path;
    const issues = staticIssuesByAgent.get(key) ?? [];
    const benchResults = resultsByAgent.get(key) ?? [];
    return computeAgentScore(sub, issues, benchResults);
  });

  const generatedAt = new Date().toISOString();
  const manifestForBoard: Manifest = manifest ?? {
    generated_at: generatedAt,
    count: 0,
    entries: [],
  };
  const leaderboard = generateLeaderboard(scores, manifestForBoard, {
    generatedAt,
    toolVersion: TOOL_VERSION,
    modelUsed: model,
    totalTasks: tasks.length,
  });

  // Persist artifacts.
  const cwd = process.cwd();
  writeJson(resolve(cwd, "leaderboard.json"), leaderboard);
  writeText(resolve(cwd, "leaderboard.md"), renderTopMarkdown(leaderboard, 20));

  const lastBaselinePath = resolve(cwd, LAST_BASELINE_DIR, LAST_BASELINE_FILE);
  ensureDir(dirname(lastBaselinePath));
  const ctx: ReportContext & { leaderboard: LeaderboardData } = {
    results: scores,
    generatedAt,
    toolVersion: TOOL_VERSION,
    leaderboard,
  };
  writeJson(lastBaselinePath, ctx);

  // Summary to stdout.
  printSummary(leaderboard, runResults, opts.format ?? "console");
}

// ---------------------------------------------------------------------------
// Helpers

function loadManifest(targetsDir: string): Manifest | null {
  const path = join(targetsDir, MANIFEST_FILE);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as Manifest;
  } catch (err) {
    console.error(
      `Warning: failed to parse ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

/**
 * Walk targets/<owner>__<repo>/*.md (one level deep). The manifest has the
 * authoritative list, but we discover from disk so a half-fetched targets
 * dir still works — we just lose the metadata enrichment for rows that
 * aren't in manifest.json.
 */
function collectTargetSubagents(targetsDir: string): ParsedSubagent[] {
  const out: ParsedSubagent[] = [];
  let entries: string[];
  try {
    entries = readdirSync(targetsDir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name.startsWith(".") || name === MANIFEST_FILE) continue;
    const sub = join(targetsDir, name);
    let st;
    try {
      st = statSync(sub);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const parsed = parseSubagentDir(sub);
    out.push(...parsed);
  }
  // Stable ordering (path ascending) for deterministic leaderboard output.
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

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

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function writeJson(path: string, value: unknown): void {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function writeText(path: string, body: string): void {
  ensureDir(dirname(path));
  writeFileSync(path, body, "utf8");
}

function renderTopMarkdown(board: LeaderboardData, limit: number): string {
  const lines: string[] = [];
  lines.push("# agelin leaderboard");
  lines.push("");
  lines.push(`Generated: ${board.generatedAt}`);
  lines.push(`Model: ${board.modelUsed}`);
  lines.push(
    `Agents: ${board.totalAgents}  Tasks: ${board.totalTasks}  Mean score: ${board.meanScore.toFixed(1)}`,
  );
  lines.push("");
  lines.push("| Rank | Agent | Score | Source | License | Tags |");
  lines.push("|------|-------|-------|--------|---------|------|");
  for (const e of board.entries.slice(0, limit)) {
    const name = e.sourceUrl ? `[${escapePipes(e.agentName)}](${e.sourceUrl})` : escapePipes(e.agentName);
    const tags = e.tags.length > 0 ? escapePipes(e.tags.join(", ")) : "";
    const license = e.license ? escapePipes(e.license) : "";
    lines.push(
      `| ${e.rank} | ${name} | ${e.score.toFixed(1)} | ${escapePipes(e.sourceRepo)} | ${license} | ${tags} |`,
    );
  }
  return lines.join("\n") + "\n";
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function printSummary(
  board: LeaderboardData,
  runResults: RunResult[],
  format: string,
): void {
  const totalCost = runResults.reduce((acc, r) => acc + (r.costUsd ?? 0), 0);
  const top5 = board.entries.slice(0, 5);
  const bottom5 = board.entries.slice(-5).reverse();

  const out = (line: string) => process.stdout.write(line + "\n");

  out("");
  out("Baseline summary");
  out("================");
  out(`Format:        ${format}`);
  out(`Model:         ${board.modelUsed}`);
  out(`Total agents:  ${board.totalAgents}`);
  out(`Total tasks:   ${board.totalTasks}`);
  out(`Total runs:    ${runResults.length}`);
  out(`Total cost:    $${totalCost.toFixed(4)}`);
  out(`Mean score:    ${board.meanScore.toFixed(2)}`);

  if (top5.length > 0) {
    out("");
    out("Top 5:");
    for (const e of top5) {
      out(`  ${String(e.rank).padStart(2)}. ${e.agentName.padEnd(32)} ${e.score.toFixed(1).padStart(6)}  ${e.sourceRepo}`);
    }
  }

  if (board.entries.length > 5) {
    out("");
    out("Bottom 5:");
    for (const e of bottom5) {
      out(`  ${String(e.rank).padStart(2)}. ${e.agentName.padEnd(32)} ${e.score.toFixed(1).padStart(6)}  ${e.sourceRepo}`);
    }
  }
  out("");
  out("Wrote leaderboard.json, leaderboard.md, .agelin/last-baseline.json");
}
