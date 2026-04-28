/**
 * Scoring functions: turn raw lint findings + bench results into a single
 * 0-100 AgentScore.
 *
 * All functions are pure. Inputs are arrays of plain objects from types.ts;
 * outputs are numbers in [0, 100] (or a struct of them).
 */

import type {
  AgentScore,
  Issue,
  ParsedSubagent,
  RunResult,
} from "../types.js";

const WEIGHT_STATIC = 0.30;
const WEIGHT_SUCCESS = 0.40;
const WEIGHT_COST = 0.20;
const WEIGHT_CONSISTENCY = 0.10;

const PENALTY: Record<Issue["severity"], number> = {
  error: 20,
  warning: 8,
  suggestion: 2,
};

/**
 * Static health: 100 - sum(severity penalties), floored at 0.
 */
export function computeStaticHealth(issues: Issue[]): number {
  let score = 100;
  for (const issue of issues) {
    score -= PENALTY[issue.severity] ?? 0;
  }
  return Math.max(0, score);
}

/**
 * Success rate as a 0-100 percent. Empty input scores 100 (vacuous truth).
 */
export function computeSuccessRate(results: RunResult[]): number {
  if (results.length === 0) return 100;
  const successes = results.filter((r) => r.success).length;
  return (100 * successes) / results.length;
}

/**
 * Cost efficiency: 100 if avg cost-per-success <= $0.01, linearly down to 0
 * at $1.00. Failed runs count toward total cost but not toward "successes."
 *
 * Edge cases:
 *   - no results: 100 (nothing was wasted)
 *   - results but zero successes: 0 (any spend with no wins is fully wasted)
 */
export function computeCostEfficiency(results: RunResult[]): number {
  if (results.length === 0) return 100;
  const successes = results.filter((r) => r.success).length;
  if (successes === 0) return 0;
  const totalCost = results.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
  const costPerSuccess = totalCost / successes;
  if (costPerSuccess <= 0.01) return 100;
  if (costPerSuccess >= 1.0) return 0;
  // linear: 0.01 -> 100, 1.00 -> 0
  const t = (costPerSuccess - 0.01) / (1.0 - 0.01);
  return 100 * (1 - t);
}

/**
 * Consistency: low variance in success-rate across repeats of the same task
 * scores high. Variance is computed across the per-task success rates (each
 * task contributes one number in [0,1]). A variance of 0 maps to 100 and a
 * variance of 0.25 (the theoretical max for a Bernoulli-style mean) maps to 0.
 */
export function computeConsistency(results: RunResult[]): number {
  if (results.length === 0) return 100;
  const byTask = new Map<string, RunResult[]>();
  for (const r of results) {
    const arr = byTask.get(r.taskId);
    if (arr) arr.push(r);
    else byTask.set(r.taskId, [r]);
  }
  const rates: number[] = [];
  for (const arr of byTask.values()) {
    const succ = arr.filter((r) => r.success).length;
    rates.push(succ / arr.length);
  }
  if (rates.length === 0) return 100;
  const mean = rates.reduce((s, x) => s + x, 0) / rates.length;
  const variance =
    rates.reduce((s, x) => s + (x - mean) * (x - mean), 0) / rates.length;
  // map 0 -> 100, 0.25 -> 0, clamp.
  const clamped = Math.max(0, Math.min(0.25, variance));
  return 100 * (1 - clamped / 0.25);
}

/**
 * Compose the four sub-scores into a final AgentScore.
 *
 * If `results` is empty (static-only mode), the final score equals
 * staticHealth — bench-only components are not penalized in their absence.
 */
export function computeAgentScore(
  agent: ParsedSubagent,
  issues: Issue[],
  results: RunResult[],
): AgentScore {
  const staticHealth = computeStaticHealth(issues);
  const successRate = computeSuccessRate(results);
  const costEfficiency = computeCostEfficiency(results);
  const consistency = computeConsistency(results);

  let score: number;
  if (results.length === 0) {
    score = staticHealth;
  } else {
    // Detect free-backend runs (claude-code via Max plan): every result
    // reports costUsd = 0. In that mode, costEfficiency degenerates to a
    // constant 100 and adds no signal — it just inflates the score floor by
    // 20pts. Drop its weight to 0 and renormalize the rest so the spread
    // between agents reflects actual quality.
    const totalCost = results.reduce((s, r) => s + (r.costUsd ?? 0), 0);
    const allFree = totalCost === 0;
    if (allFree) {
      // 30/40/10 -> renormalize to sum to 1 -> 37.5/50/12.5
      const sum = WEIGHT_STATIC + WEIGHT_SUCCESS + WEIGHT_CONSISTENCY;
      score =
        (WEIGHT_STATIC / sum) * staticHealth +
        (WEIGHT_SUCCESS / sum) * successRate +
        (WEIGHT_CONSISTENCY / sum) * consistency;
    } else {
      score =
        WEIGHT_STATIC * staticHealth +
        WEIGHT_SUCCESS * successRate +
        WEIGHT_COST * costEfficiency +
        WEIGHT_CONSISTENCY * consistency;
    }
  }

  return {
    agentName: agent.frontmatter.name,
    agentPath: agent.path,
    score: roundTo(score, 2),
    components: {
      staticHealth: roundTo(staticHealth, 2),
      successRate: roundTo(successRate, 2),
      costEfficiency: roundTo(costEfficiency, 2),
      consistency: roundTo(consistency, 2),
    },
    staticIssues: issues,
    benchResults: results.length > 0 ? results : undefined,
  };
}

function roundTo(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
