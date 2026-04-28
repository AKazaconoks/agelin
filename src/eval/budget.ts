/**
 * Budget enforcement for benchmark runs.
 *
 * Used by the runner to (a) abort early when token/duration ceilings are
 * crossed and (b) flag cost / tool-call overruns post-hoc once the run
 * finishes.
 *
 * The function is intentionally a single, pure check — call it whenever you
 * have a fresh partial RunResult on hand and react to its verdict.
 */

import type { GoldenTask, RunResult } from "../types.js";

export interface BudgetVerdict {
  exceeded: boolean;
  reason?: string;
}

/**
 * Check the partial result against the task's budget thresholds.
 * Any populated field on `partial` is checked; missing fields are skipped.
 */
export function enforceBudget(
  task: GoldenTask,
  partial: Partial<RunResult>,
): BudgetVerdict {
  const budget = task.budget ?? {};

  if (
    typeof budget.maxTokens === "number" &&
    typeof partial.inputTokens === "number" &&
    typeof partial.outputTokens === "number"
  ) {
    const total = partial.inputTokens + partial.outputTokens;
    if (total > budget.maxTokens) {
      return {
        exceeded: true,
        reason: `token budget exceeded: ${total} > ${budget.maxTokens}`,
      };
    }
  }

  if (
    typeof budget.maxCostUsd === "number" &&
    typeof partial.costUsd === "number" &&
    partial.costUsd > budget.maxCostUsd
  ) {
    return {
      exceeded: true,
      reason: `cost budget exceeded: $${partial.costUsd.toFixed(4)} > $${budget.maxCostUsd.toFixed(4)}`,
    };
  }

  if (
    typeof budget.maxDurationSec === "number" &&
    typeof partial.durationMs === "number"
  ) {
    const seconds = partial.durationMs / 1000;
    if (seconds > budget.maxDurationSec) {
      return {
        exceeded: true,
        reason: `duration budget exceeded: ${seconds.toFixed(2)}s > ${budget.maxDurationSec}s`,
      };
    }
  }

  if (
    typeof budget.maxToolCalls === "number" &&
    Array.isArray(partial.toolCalls)
  ) {
    const total = partial.toolCalls.reduce((sum, t) => sum + (t.count ?? 0), 0);
    if (total > budget.maxToolCalls) {
      return {
        exceeded: true,
        reason: `tool-call budget exceeded: ${total} > ${budget.maxToolCalls}`,
      };
    }
  }

  return { exceeded: false };
}
