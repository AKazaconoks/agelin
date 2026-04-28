/**
 * Per-rule unit tests for `description-uses-examples-instead-of-summary`.
 *
 * Detection logic:
 *   - Skip descriptions ≤300 chars.
 *   - Condition A: >50% of chars inside `<example>...</example>` tags.
 *   - Condition B: description starts with "e.g." or "example:".
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/description-uses-examples-instead-of-summary.js";
import type { ParsedSubagent } from "../src/types.js";

function mkSubagent(opts: Partial<ParsedSubagent> & { body: string; frontmatter?: ParsedSubagent["frontmatter"] }): ParsedSubagent {
  return {
    path: "test.md",
    raw: "test",
    frontmatter: opts.frontmatter ?? { name: "test", description: "test" },
    body: opts.body,
    bodyTokens: Math.ceil(opts.body.length / 4),
    parseErrors: [],
    ast: undefined,
    ...opts,
  };
}

describe("description-uses-examples-instead-of-summary", () => {
  test("fires on a long description dominated by <example> tags", () => {
    const exampleA = "<example>" + "x".repeat(180) + "</example>";
    const exampleB = "<example>" + "y".repeat(180) + "</example>";
    const desc = `Trigger on user X. ${exampleA} ${exampleB}`;
    const sa = mkSubagent({
      frontmatter: { name: "t", description: desc },
      body: "",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("description-uses-examples-instead-of-summary");
  });

  test("fires when a long description starts with 'e.g.'", () => {
    const desc = "e.g. " + "the user wants a code review and asks the agent to explain the diff. ".repeat(6);
    const sa = mkSubagent({
      frontmatter: { name: "t", description: desc },
      body: "",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
  });

  test("does not fire on a short description (<=300 chars), even with <example> tags", () => {
    const desc = "Use when X. <example>tiny</example>";
    const sa = mkSubagent({
      frontmatter: { name: "t", description: desc },
      body: "",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on a long description that is summary-led (no examples, no e.g.)", () => {
    const desc = "Use this agent when the user asks for a thorough code review of a TypeScript pull request. The agent reads the diff, identifies issues across correctness, performance, security, and style, and returns a structured JSON report. Trigger word: 'code review'.";
    const sa = mkSubagent({
      frontmatter: { name: "t", description: desc },
      body: "",
    });
    expect(rule.check(sa)).toEqual([]);
  });
});
