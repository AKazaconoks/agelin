import { describe, expect, test } from "bun:test";
import {
  computeAgentScore,
  computeStaticHealth,
  computeSuccessRate,
} from "../src/scoring/score.js";
import type { Issue, ParsedSubagent, RunResult } from "../src/types.js";

const stubAgent: ParsedSubagent = {
  path: "/tmp/example.md",
  raw: "",
  frontmatter: { name: "example", description: "stub" },
  body: "",
  bodyTokens: 0,
  parseErrors: [],
};

function mkResult(success: boolean, taskId = "t1"): RunResult {
  return {
    taskId,
    agentName: "example",
    success,
    durationMs: 100,
    costUsd: 0.001,
    inputTokens: 10,
    outputTokens: 10,
    toolCalls: [],
    output: "",
  };
}

describe("computeStaticHealth", () => {
  test("empty issues list scores 100", () => {
    expect(computeStaticHealth([])).toBe(100);
  });

  test("a single error subtracts 20", () => {
    const issues: Issue[] = [
      {
        ruleId: "tool-overreach",
        severity: "error",
        message: "too many tools",
      },
    ];
    expect(computeStaticHealth(issues)).toBe(80);
  });
});

describe("computeSuccessRate", () => {
  test("3 of 4 successes = 75", () => {
    const results = [
      mkResult(true),
      mkResult(true),
      mkResult(true),
      mkResult(false),
    ];
    expect(computeSuccessRate(results)).toBe(75);
  });
});

describe("computeAgentScore", () => {
  test("static-only mode returns staticHealth as the final score", () => {
    const issues: Issue[] = [
      {
        ruleId: "no-exit-criteria",
        severity: "warning",
        message: "no exit",
      },
    ];
    const score = computeAgentScore(stubAgent, issues, []);
    // warning costs 8, so staticHealth = 92.
    expect(score.components.staticHealth).toBe(92);
    expect(score.score).toBe(92);
    expect(score.benchResults).toBeUndefined();
  });
});
