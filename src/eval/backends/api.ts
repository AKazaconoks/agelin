/**
 * "api" backend — direct Anthropic Messages API.
 *
 * This is the original eval path, repackaged behind the Backend interface.
 * It instantiates the official `@anthropic-ai/sdk` client (or accepts an
 * injected fake for tests) and delegates to the shared `runConversation`
 * loop in `../conversation.ts` — which already handles multi-turn dialog,
 * tool dispatch into the per-task sandbox, retries, and budget enforcement.
 *
 * `runConversation` is treated as a frozen primitive: we do not modify it,
 * we just adapt its ConversationResult into the canonical `RunResult` shape
 * that the rest of the harness expects.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { GoldenTask, ParsedSubagent, RunResult } from "../../types.js";
import { evaluate } from "../assertions.js";
import { enforceBudget } from "../budget.js";
import {
  runConversation,
  type AnthropicLike,
  type ConversationResult,
} from "../conversation.js";
import { priceUsage } from "../pricing.js";
import type { Backend, BackendOpts } from "./index.js";

const DEFAULT_MAX_TOKENS = 1024;

export class ApiBackend implements Backend {
  readonly id = "api" as const;

  /** Optional client override — used by tests to inject a fake AnthropicLike. */
  private readonly clientOverride?: AnthropicLike;

  constructor(clientOverride?: AnthropicLike) {
    this.clientOverride = clientOverride;
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY || this.clientOverride !== undefined;
  }

  async runOnce(
    agent: ParsedSubagent,
    task: GoldenTask,
    opts: BackendOpts,
  ): Promise<RunResult> {
    const started = Date.now();
    const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "";
    const client: AnthropicLike =
      this.clientOverride ??
      (new Anthropic({ apiKey }) as unknown as AnthropicLike);

    let conversation: ConversationResult | undefined;
    let transportError: unknown;
    try {
      conversation = await runConversation(client, agent, task, opts.sandbox, {
        model: opts.model,
        maxTokens: DEFAULT_MAX_TOKENS,
      });
    } catch (err) {
      transportError = err;
    }

    const durationMs = Date.now() - started;

    if (transportError !== undefined || conversation === undefined) {
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
        failureReason: `api error: ${
          transportError instanceof Error
            ? transportError.message
            : String(transportError)
        }`,
      };
    }

    const inputTokens = conversation.totalUsage.input_tokens;
    const outputTokens = conversation.totalUsage.output_tokens;
    const costUsd = priceUsage(opts.model, {
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

    if (conversation.abortedReason) {
      result.failureReason = conversation.abortedReason;
      return result;
    }

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
}
