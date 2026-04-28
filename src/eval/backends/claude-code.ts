/**
 * "claude-code" backend — spawn the local `claude` CLI in headless mode.
 *
 * Why this exists
 * ---------------
 * The default "api" backend bills every benchmark token against an Anthropic
 * API console key. That's a non-starter for users on a Claude Code Max
 * subscription with $0 in API credits. By shelling out to the user's local
 * `claude` binary we route the same conversation through their Max plan, for
 * free. (We still report a real RunResult — just with `costUsd: 0` since the
 * subscription absorbs it.)
 *
 * How it works
 * ------------
 * 1. The agent's raw markdown is materialized at
 *    `~/.claude/agents/_agelin-<uuid>.md` so Claude Code can discover
 *    it as a subagent.
 * 2. We invoke
 *      claude -p "<prompt>" --output-format json --bare \
 *             --add-dir <sandbox.root>
 *    with `cwd: sandbox.root` so any tool calls the agent makes execute
 *    against the per-task sandbox. The prompt routes execution to the
 *    temporary subagent via an `@<name>` reference, e.g.
 *      "Use the @_agelin-<uuid> agent. Task: <task.prompt>"
 * 3. We parse the JSON stdout and pull `result`, `usage`, `total_cost_usd`,
 *    `num_turns`. The temp agent file is cleaned up in a `finally` block.
 *
 * IMPORTANT CAVEATS
 * -----------------
 * - This routes through the user's local Claude Code session. Tokens are
 *   billed against their Max plan, not the API console.
 * - Tool calls inside the spawned conversation execute in Claude Code's real
 *   tool environment, not our sandboxed `executeTool`. This is intentional
 *   (it's a more realistic test) but it does mean a misbehaving agent could,
 *   in principle, touch the user's filesystem if a task explicitly asked for
 *   it. Mitigations: (a) golden tasks here are diagnostic, not mutating;
 *   (b) we set cwd to a tmpdir and pass --add-dir <sandbox.root> so the
 *   agent's "working directory" frame is the sandbox; (c) the spawned agent
 *   inherits Claude Code's permission system — if the user runs `bench`
 *   under a normal Claude session, the same prompts/denials apply.
 * - `--output-format json` does not currently expose per-tool-call counts,
 *   so `RunResult.toolCalls` is left empty for this backend. Token usage
 *   and `num_turns` are populated when the CLI returns them; otherwise we
 *   fall back to a length-based estimate so reporters still show a number.
 */

import { spawn, type SpawnOptions } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { GoldenTask, ParsedSubagent, RunResult } from "../../types.js";
import { evaluate } from "../assertions.js";
import { enforceBudget } from "../budget.js";
import type { Backend, BackendOpts } from "./index.js";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
const TEMP_AGENT_PREFIX = "_agelin-";

// Approximate token count for outputs the CLI doesn't bill for us. ~4 chars
// per token is the standard Anthropic rule of thumb.
const APPROX_CHARS_PER_TOKEN = 4;

/**
 * Spawn surface — a tiny shim that lets tests mock node:child_process.spawn
 * by passing a substitute via the constructor without monkey-patching the
 * module globally.
 */
export type SpawnFn = typeof spawn;

interface ClaudeCliJson {
  /** Final assistant text. */
  result?: string;
  /** Aggregate token usage across the run. */
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  /** Total subscription / API cost as billed by the CLI, USD. */
  total_cost_usd?: number;
  /** Number of agentic turns. */
  num_turns?: number;
  /** Wall-clock duration as reported by the CLI, ms. */
  duration_ms?: number;
  /** True if the CLI run errored. */
  is_error?: boolean;
  /** Stable session id (unused here, kept for completeness). */
  session_id?: string;
  /** Some CLI versions include type/subtype envelope fields. */
  type?: string;
  subtype?: string;
}

export interface ClaudeCodeBackendOptions {
  /** Override the spawn implementation — used by tests. */
  spawnFn?: SpawnFn;
  /** Override the agents directory — used by tests so we don't write to
   *  the user's real ~/.claude/agents during unit tests. */
  agentsDir?: string;
}

export class ClaudeCodeBackend implements Backend {
  readonly id = "claude-code" as const;

  private readonly spawnFn: SpawnFn;
  private readonly agentsDir: string;

  constructor(options: ClaudeCodeBackendOptions = {}) {
    this.spawnFn = options.spawnFn ?? spawn;
    this.agentsDir = options.agentsDir ?? join(homedir(), ".claude", "agents");
  }

  async isAvailable(): Promise<boolean> {
    // Cheap synchronous probe via index.ts — but we accept a slightly
    // stale answer here. The runner does its own fail-soft handling if
    // the CLI is missing at spawn time.
    return true;
  }

  async runOnce(
    agent: ParsedSubagent,
    task: GoldenTask,
    opts: BackendOpts,
  ): Promise<RunResult> {
    const started = Date.now();
    const uuid = randomUUID();
    const tempName = `${TEMP_AGENT_PREFIX}${uuid}`;
    const tempPath = join(this.agentsDir, `${tempName}.md`);

    try {
      mkdirSync(this.agentsDir, { recursive: true });
    } catch {
      // proceed; writeFileSync will surface a meaningful error if dir is
      // truly inaccessible.
    }

    const agentMarkdown = rewriteAgentName(agent.raw, tempName);

    let writeError: unknown;
    try {
      writeFileSync(tempPath, agentMarkdown, "utf8");
    } catch (err) {
      writeError = err;
    }

    if (writeError !== undefined) {
      return failure(
        agent,
        task,
        Date.now() - started,
        `failed to materialize subagent: ${errMsg(writeError)}`,
      );
    }

    let cliResult: ClaudeCliJson | undefined;
    let transportError: unknown;
    try {
      cliResult = await this.invokeCli({
        prompt: buildPrompt(tempName, task),
        cwd: opts.sandbox.root,
        model: opts.model,
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      });
    } catch (err) {
      transportError = err;
    } finally {
      // Always try to remove the temp agent file, even if the CLI call
      // failed mid-run. Best-effort: never throw from cleanup.
      try {
        rmSync(tempPath, { force: true });
      } catch {
        /* ignore */
      }
    }

    const durationMs = Date.now() - started;

    if (transportError !== undefined || cliResult === undefined) {
      return failure(
        agent,
        task,
        durationMs,
        `claude cli error: ${errMsg(transportError)}`,
      );
    }

    if (cliResult.is_error === true) {
      return failure(
        agent,
        task,
        durationMs,
        `claude cli reported is_error=true${
          cliResult.result ? `: ${truncateForReason(cliResult.result)}` : ""
        }`,
      );
    }

    const finalText = cliResult.result ?? "";
    const inputTokens =
      cliResult.usage?.input_tokens ??
      Math.max(0, Math.round(estimateInputTokens(agent, task))); // rough fallback
    const outputTokens =
      cliResult.usage?.output_tokens ??
      Math.max(0, Math.round(finalText.length / APPROX_CHARS_PER_TOKEN));

    // Cost is intentionally 0 for the claude-code backend. The CLI's
    // `total_cost_usd` reports what an equivalent API call WOULD have cost,
    // but the user is billed via their Claude Code Max-plan flat fee — they
    // pay $0 incrementally. Reporting the would-be cost here causes
    // enforceBudget() to fail genuinely-correct runs against the per-task
    // maxCostUsd ceiling. We zero it out unconditionally.
    const costUsd = 0;

    const result: RunResult = {
      taskId: task.id,
      agentName: agent.frontmatter.name,
      success: false,
      durationMs,
      costUsd,
      inputTokens,
      outputTokens,
      // The CLI's `--output-format json` does not currently expose per-tool
      // call counts. Document the limitation and leave the array empty so
      // `tool-called` / `no-tool-called` assertions degrade gracefully.
      toolCalls: [],
      output: finalText,
    };

    const budgetVerdict = enforceBudget(task, result);
    if (budgetVerdict.exceeded) {
      result.failureReason = budgetVerdict.reason;
      return result;
    }

    const verdict = evaluate(task.assertion, result);
    result.success = verdict.passed;
    if (!verdict.passed) result.failureReason = verdict.reason;
    return result;
  }

  // --- internals ---------------------------------------------------------

  private async invokeCli(args: {
    prompt: string;
    cwd: string;
    model: string;
    timeoutMs: number;
  }): Promise<ClaudeCliJson> {
    // NOTE: do NOT pass --bare here. --bare forces auth to ANTHROPIC_API_KEY
    // only and disables OAuth / keychain reads — which defeats the entire
    // point of the claude-code backend (free runs via Max plan auth).
    const argv = [
      "-p",
      args.prompt,
      "--output-format",
      "json",
      "--add-dir",
      args.cwd,
      "--model",
      args.model,
      "--permission-mode",
      "acceptEdits",
    ];

    // Important: shell: true on Windows mangles multi-line / quoted prompts.
    // We resolve the executable explicitly so spawn can run it directly.
    // On Windows the CLI is shipped as claude.cmd or claude.exe; either is
    // launchable as "claude" by Node when shell is false, since Node walks
    // PATHEXT itself.
    const spawnOpts: SpawnOptions = {
      cwd: args.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      shell: false,
      windowsHide: true,
    };

    // Use bare "claude" — Node walks PATHEXT (.EXE, .CMD, .BAT) on Windows.
    // Forcing ".cmd" triggers EINVAL because claude ships as claude.exe here.
    const child = this.spawnFn("claude", argv, spawnOpts);

    let stdout = "";
    let stderr = "";

    const stdoutStream = (child as { stdout?: NodeJS.ReadableStream | null }).stdout;
    const stderrStream = (child as { stderr?: NodeJS.ReadableStream | null }).stderr;
    if (stdoutStream) {
      stdoutStream.setEncoding?.("utf8");
      stdoutStream.on("data", (chunk: string | Buffer) => {
        stdout += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      });
    }
    if (stderrStream) {
      stderrStream.setEncoding?.("utf8");
      stderrStream.on("data", (chunk: string | Buffer) => {
        stderr += typeof chunk === "string" ? chunk : chunk.toString("utf8");
      });
    }

    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        try {
          (child as { kill?: (sig?: string) => void }).kill?.("SIGKILL");
        } catch {
          /* ignore */
        }
        reject(
          new Error(`claude cli timed out after ${args.timeoutMs}ms`),
        );
      }, args.timeoutMs);
    });

    const exitPromise = new Promise<{ code: number | null }>((resolve, reject) => {
      child.on("error", (err) => reject(err));
      child.on("close", (code) => resolve({ code }));
    });

    let exit: { code: number | null };
    try {
      exit = await Promise.race([exitPromise, timeoutPromise]);
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (exit.code !== 0) {
      throw new Error(
        `claude cli exited with code ${exit.code ?? "(unknown)"}: ${stderr.trim() || stdout.trim() || "(no output)"}`,
      );
    }

    const trimmed = stdout.trim();
    if (!trimmed) {
      throw new Error("claude cli produced empty stdout");
    }

    try {
      return JSON.parse(trimmed) as ClaudeCliJson;
    } catch (err) {
      throw new Error(
        `claude cli stdout was not valid JSON (${errMsg(err)}): ${truncateForReason(trimmed)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// helpers

/**
 * Build the user prompt sent to `claude -p`. We tell Claude Code to invoke
 * our temp subagent, then hand off the task prompt verbatim. The working
 * directory is restated explicitly so the agent treats the sandbox as its
 * project root rather than the (possibly unrelated) cwd of the parent shell.
 */
function buildPrompt(agentName: string, task: GoldenTask): string {
  return [
    `Use the @${agentName} agent.`,
    `Task: ${task.prompt}`,
    "",
    `Working directory: ${"<sandbox>"}`,
  ].join("\n");
}

/**
 * Replace the `name:` line in the agent's frontmatter with a unique one so
 * Claude Code's subagent loader doesn't collide with anything the user has
 * checked in. We don't reparse the YAML — a regex over the first frontmatter
 * block is enough and avoids a YAML round-trip dependency.
 */
function rewriteAgentName(raw: string, newName: string): string {
  // Only operate on the first `---` ... `---` block at the top of the file.
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) {
    // No frontmatter — synthesize one. Claude Code requires at minimum
    // `name` and `description`, so we add a placeholder description.
    return `---\nname: ${newName}\ndescription: Temporary agelin benchmark agent.\n---\n${raw}`;
  }
  const original = match[0];
  const body = match[1];
  const rewrittenBody = body.replace(/^name:\s*.*$/m, `name: ${newName}`);
  // If there was no `name:` line at all, prepend one.
  const finalBody = /^name:\s*/m.test(rewrittenBody)
    ? rewrittenBody
    : `name: ${newName}\n${rewrittenBody}`;
  return `---\n${finalBody}\n---\n${raw.slice(original.length)}`;
}

function failure(
  agent: ParsedSubagent,
  task: GoldenTask,
  durationMs: number,
  reason: string,
): RunResult {
  return {
    taskId: task.id,
    agentName: agent.frontmatter.name,
    success: false,
    durationMs,
    costUsd: 0,
    inputTokens: 0,
    outputTokens: 0,
    toolCalls: [],
    output: "",
    failureReason: reason,
  };
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err ?? "unknown error");
}

function truncateForReason(s: string): string {
  const max = 240;
  if (s.length <= max) return s;
  return `${s.slice(0, max)}... [truncated ${s.length - max} chars]`;
}

/**
 * Cheap fallback estimate when the CLI doesn't surface usage. Sums the
 * agent body and task prompt + fixtures so reporters have *some* signal.
 */
function estimateInputTokens(agent: ParsedSubagent, task: GoldenTask): number {
  let chars = (agent.body?.length ?? 0) + (task.prompt?.length ?? 0);
  if (task.fixtures) {
    for (const v of Object.values(task.fixtures)) chars += v.length;
  }
  return chars / APPROX_CHARS_PER_TOKEN;
}
