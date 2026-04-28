/**
 * Per-rule unit tests for `hidden-tutorial`.
 *
 * Detection logic:
 *   - Whole-word, case-insensitive match against tutorial-scaffolding
 *     phrases ("Let me explain", "In this guide", "we will learn",
 *     "Step 1: First, we'll", ...).
 *   - One issue per matched phrase.
 *   - Imperative-style bodies (no scaffolding) must NOT fire.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/hidden-tutorial.js";
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

describe("hidden-tutorial", () => {
  test("fires on 'Let me explain' phrasing", () => {
    const sa = mkSubagent({
      body: "Let me explain how to review code. First, you read the diff.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("hidden-tutorial");
  });

  test("fires on 'In this guide' phrasing", () => {
    const sa = mkSubagent({
      body: "In this guide we will walk through how the agent should respond.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBeGreaterThan(0);
  });

  test("does not fire on instruction-style imperative body", () => {
    const sa = mkSubagent({
      body: "Read the diff. Identify defects. Return a JSON report with the findings.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("returns no issues for empty body", () => {
    expect(rule.check(mkSubagent({ body: "" }))).toEqual([]);
  });
});
