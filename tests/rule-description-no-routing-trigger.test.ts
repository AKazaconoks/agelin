/**
 * Per-rule unit tests for `description-no-routing-trigger`.
 *
 * Detection logic:
 *   - description must be ≥20 chars (else handled by other rules)
 *   - description must contain a narrow role noun (expert/specialist/etc.)
 *   - description must NOT contain a when-to-route trigger keyword
 *
 * Catches the "wolf" cluster from the cycle-5 launch analysis (c-expert,
 * bash-expert, ava-expert) without firing on well-routed agents like
 * angular-expert ("Use PROACTIVELY") or architect-reviewer ("Use after").
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/description-no-routing-trigger.js";
import type { ParsedSubagent } from "../src/types.js";

function mkSubagent(description: string): ParsedSubagent {
  return {
    path: "test.md",
    raw: "test",
    frontmatter: { name: "test", description },
    body: "",
    bodyTokens: 0,
    parseErrors: [],
    ast: undefined,
  };
}

describe("description-no-routing-trigger", () => {
  test("fires on a pure self-description with no when-clause", () => {
    const sa = mkSubagent(
      "C language expert specializing in efficient, reliable systems-level programming.",
    );
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("description-no-routing-trigger");
  });

  test("fires on 'Master of X' style descriptions", () => {
    const sa = mkSubagent(
      "Master of defensive Bash scripting for production automation, with a focus on reliability.",
    );
    expect(rule.check(sa).length).toBe(1);
  });

  test("does not fire when description includes 'Use PROACTIVELY'", () => {
    const sa = mkSubagent(
      "Angular expert. Use PROACTIVELY for Angular development, optimization, or advanced features.",
    );
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when description includes 'Use after'", () => {
    const sa = mkSubagent(
      "Senior architect specialist. Use after structural changes, new service introductions, or API modifications.",
    );
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when description includes 'Use when the user'", () => {
    const sa = mkSubagent(
      "Frontend developer expert. Use when the user asks to scaffold a React component.",
    );
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when description includes 'Use this agent'", () => {
    const sa = mkSubagent(
      "Code reviewer. Use this agent to audit recent changes for security or correctness regressions.",
    );
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on descriptions without role nouns", () => {
    // Generic description without "expert"/"specialist" — covered by other rules.
    const sa = mkSubagent("Reviews recent commits and reports likely regressions.");
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on very short descriptions (handled elsewhere)", () => {
    const sa = mkSubagent("C expert.");
    expect(rule.check(sa)).toEqual([]);
  });

  test("fires on 'X specialist' phrasing", () => {
    const sa = mkSubagent(
      "Database specialist focused on Cassandra schema design and query tuning.",
    );
    expect(rule.check(sa).length).toBe(1);
  });

  test("does not fire when 'invoke when' is present", () => {
    const sa = mkSubagent(
      "Performance specialist. Invoke when latency regressions appear in production traces.",
    );
    expect(rule.check(sa)).toEqual([]);
  });

  test("fires on 'Expertise in X' nominal phrasing", () => {
    // bun-expert pattern from the calibration corpus.
    const sa = mkSubagent(
      "Expertise in Bun, focusing on high-performance JavaScript runtime, efficient module execution, and optimized bundling.",
    );
    expect(rule.check(sa).length).toBe(1);
  });

  test("fires on 'Mastery of X' nominal phrasing", () => {
    const sa = mkSubagent(
      "Mastery of Kubernetes operator design, including custom resource definitions and reconciliation loops.",
    );
    expect(rule.check(sa).length).toBe(1);
  });

  test("does not fire when 'Expertise in X' is paired with a routing trigger", () => {
    const sa = mkSubagent(
      "Expertise in Bun. Use when the user asks for Bun runtime optimisations.",
    );
    expect(rule.check(sa)).toEqual([]);
  });
});
