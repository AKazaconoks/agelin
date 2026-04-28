/**
 * Benchmark runner.
 *
 * For each (agent, task, repeat) triple we run a real multi-turn conversation
 * against the Anthropic Messages API. The agent's markdown body is the system
 * prompt; the task prompt is the first user message; tool calls emitted by
 * the model are *executed* against a per-task sandbox (see `sandbox.ts` and
 * `tools.ts`) and their results fed back as `tool_result` blocks. The loop
 * terminates when the model stops asking for tools, the budget is exceeded,
 * or a hard 12-turn cap is hit.
 *
 * Concurrency is capped at 4 in-flight conversations via a small inline
 * limiter so we do not hammer the API or burn through rate limits.
 *
 * (v0 used to be a "tool-call recorder" that recorded tool_use blocks
 * without executing them. That is no longer the case — we run for real now,
 * and the success/failure scores reflect actual behavior, not intent.)
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  GoldenTask,
  ParsedSubagent,
  RunResult,
} from "../types.js";
import { evaluate } from "./assertions.js";
import { enforceBudget } from "./budget.js";
import { createSandbox } from "./sandbox.js";
import { priceUsage } from "./pricing.js";
import { makeRunId, type ProgressTracker } from "./progress.js";
import {
  runConversation,
  type AnthropicLike,
  type ConversationResult,
} from "./conversation.js";
import type { Backend } from "./backends/index.js";

const MAX_CONCURRENCY = 4;
const DEFAULT_MAX_TOKENS = 1024;

export interface RunBenchmarkOpts {
  repeats: number;
  model: string;
  apiKey: string;
  /** Override the SDK client — used by tests to inject a fake. */
  client?: AnthropicLike;
  /** Optional progress tracker for streaming UI; events fire per (agent, task, repeat). */
  tracker?: ProgressTracker;
  /**
   * Optional backend override. When provided, every (agent, task, repeat)
   * triple is dispatched via `backend.runOnce` instead of the inline
   * `runConversation` path. Default behavior (back-compat for existing
   * callers/tests) is unchanged when omitted.
   */
  backend?: Backend;
  /**
   * Optional incremental hook fired immediately after each (agent, task,
   * repeat) completes. Used by bench.ts to save cache entries as they land
   * so a long benchmark can be resumed if the host process is killed.
   * Errors thrown by the callback are swallowed.
   */
  onResult?: (
    result: RunResult,
    agent: ParsedSubagent,
    task: GoldenTask,
    repeat: number,
  ) => void | Promise<void>;
}

// Re-export the client surface so callers (and tests) keep their existing
// imports working after we moved the canonical definition into conversation.ts.
export type {
  AnthropicLike,
  AnthropicCreateParams,
  AnthropicMessageResponse,
  AnthropicToolDef,
} from "./conversation.js";

/**
 * Run the full benchmark matrix. Returns one RunResult per (agent, task,
 * repeat) — failures (budget, transport, assertion) all surface as RunResult
 * objects with success=false and a populated failureReason.
 */
export async function runBenchmark(
  agents: ParsedSubagent[],
  tasks: GoldenTask[],
  opts: RunBenchmarkOpts,
): Promise<RunResult[]> {
  const client: AnthropicLike =
    opts.client ?? (new Anthropic({ apiKey: opts.apiKey }) as AnthropicLike);

  const triples: Array<{
    agent: ParsedSubagent;
    task: GoldenTask;
    repeat: number;
  }> = [];
  for (const agent of agents) {
    for (const task of tasks) {
      for (let r = 0; r < Math.max(1, opts.repeats); r++) {
        triples.push({ agent, task, repeat: r });
      }
    }
  }

  const totalRepeats = Math.max(1, opts.repeats);

  const tasksFns = triples.map(
    ({ agent, task, repeat }) =>
      async () => {
        const result = opts.backend
          ? await runOneViaBackend(
              opts.backend,
              agent,
              task,
              repeat,
              totalRepeats,
              opts.model,
              opts.apiKey,
              opts.tracker,
            )
          : await runOne(client, agent, task, repeat, totalRepeats, opts.model, opts.tracker);
        if (opts.onResult) {
          try {
            await opts.onResult(result, agent, task, repeat);
          } catch {
            /* incremental persistence is best-effort */
          }
        }
        return result;
      },
  );

  return await runWithLimit(tasksFns, MAX_CONCURRENCY);
}

// ---------------------------------------------------------------------------

async function runOne(
  client: AnthropicLike,
  agent: ParsedSubagent,
  task: GoldenTask,
  repeat: number,
  totalRepeats: number,
  model: string,
  tracker?: ProgressTracker,
): Promise<RunResult> {
  const started = Date.now();
  const agentName = agent.frontmatter.name;
  const runId = makeRunId(agentName, task.id, repeat);
  if (tracker) {
    tracker.runStart({ runId, agentName, taskId: task.id, repeat, totalRepeats });
  }

  const sandbox = await createSandbox(task);
  let conversation: ConversationResult | undefined;
  let transportError: unknown;
  try {
    conversation = await runConversation(client, agent, task, sandbox, {
      model,
      maxTokens: DEFAULT_MAX_TOKENS,
    });
  } catch (err) {
    transportError = err;
  } finally {
    await sandbox.dispose();
  }

  const durationMs = Date.now() - started;

  if (transportError !== undefined || conversation === undefined) {
    const failed: RunResult = {
      taskId: task.id,
      agentName: agent.frontmatter.name,
      success: false,
      durationMs,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: [],
      output: "",
      failureReason: `api error: ${
        transportError instanceof Error
          ? transportError.message
          : String(transportError)
      }`,
    };
    if (tracker) {
      tracker.runEnd({ runId, agentName, taskId: task.id, repeat, totalRepeats, result: failed });
    }
    return failed;
  }

  const inputTokens = conversation.totalUsage.input_tokens;
  const outputTokens = conversation.totalUsage.output_tokens;
  const costUsd = priceUsage(model, {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  });

  const result: RunResult = {
    taskId: task.id,
    agentName: agent.frontmatter.name,
    success: false,
    durationMs,
    costUsd,
    inputTokens,
    outputTokens,
    toolCalls: conversation.toolCalls,
    output: conversation.finalText,
  };

  // If the conversation aborted early (budget / turn cap), surface that
  // rather than letting the assertion run against partial output.
  if (conversation.abortedReason) {
    result.failureReason = conversation.abortedReason;
    if (tracker) {
      tracker.runEnd({ runId, agentName, taskId: task.id, repeat, totalRepeats, result });
    }
    return result;
  }

  // Belt-and-braces final budget check: even if conversation.ts didn't trip
  // mid-loop, the overall result must respect the budget.
  const budgetVerdict = enforceBudget(task, result);
  if (budgetVerdict.exceeded) {
    result.failureReason = budgetVerdict.reason;
    if (tracker) {
      tracker.runEnd({ runId, agentName, taskId: task.id, repeat, totalRepeats, result });
    }
    return result;
  }

  const verdict = evaluate(task.assertion, result);
  result.success = verdict.passed;
  if (!verdict.passed) result.failureReason = verdict.reason;

  if (tracker) {
    tracker.runEnd({ runId, agentName, taskId: task.id, repeat, totalRepeats, result });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Backend-driven path
//
// When a Backend is supplied via RunBenchmarkOpts, we delegate the entire
// (agent, task, repeat) lifecycle to it. The backend is responsible for
// budget enforcement and assertion evaluation; the runner only owns sandbox
// setup/teardown, progress events, and an outer transport-error guard.

async function runOneViaBackend(
  backend: Backend,
  agent: ParsedSubagent,
  task: GoldenTask,
  repeat: number,
  totalRepeats: number,
  model: string,
  apiKey: string,
  tracker?: ProgressTracker,
): Promise<RunResult> {
  const started = Date.now();
  const agentName = agent.frontmatter.name;
  const runId = makeRunId(agentName, task.id, repeat);
  if (tracker) {
    tracker.runStart({ runId, agentName, taskId: task.id, repeat, totalRepeats });
  }

  const sandbox = await createSandbox(task);
  let result: RunResult | undefined;
  let transportError: unknown;
  try {
    result = await backend.runOnce(agent, task, {
      model,
      sandbox,
      apiKey,
    });
  } catch (err) {
    transportError = err;
  } finally {
    await sandbox.dispose();
  }

  if (transportError !== undefined || result === undefined) {
    const failed: RunResult = {
      taskId: task.id,
      agentName,
      success: false,
      durationMs: Date.now() - started,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      toolCalls: [],
      output: "",
      failureReason: `backend(${backend.id}) error: ${
        transportError instanceof Error
          ? transportError.message
          : String(transportError ?? "unknown")
      }`,
    };
    if (tracker) {
      tracker.runEnd({ runId, agentName, taskId: task.id, repeat, totalRepeats, result: failed });
    }
    return failed;
  }

  if (tracker) {
    tracker.runEnd({ runId, agentName, taskId: task.id, repeat, totalRepeats, result });
  }
  return result;
}

// ---------------------------------------------------------------------------
// tiny p-limit-style concurrency cap

async function runWithLimit<T>(
  fns: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(fns.length);
  let next = 0;

  async function worker(): Promise<void> {
    while (true) {
      const idx = next++;
      if (idx >= fns.length) return;
      results[idx] = await fns[idx]();
    }
  }

  const workers: Promise<void>[] = [];
  const n = Math.max(1, Math.min(limit, fns.length));
  for (let i = 0; i < n; i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}
