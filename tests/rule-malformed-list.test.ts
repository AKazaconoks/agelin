/**
 * Per-rule unit tests for `malformed-list`.
 *
 * Detection logic:
 *   - Group adjacent ordered list items at the same indent into "runs".
 *   - Within a run, indices must be strictly 1..N. Otherwise emit one issue.
 *   - Skip lines inside fenced code blocks.
 *   - Single-item runs are never malformed.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/malformed-list.js";
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

describe("malformed-list", () => {
  test("fires on a list with a gap (1, 2, 4)", () => {
    const body = [
      "Steps:",
      "",
      "1. First",
      "2. Second",
      "4. Fourth",
    ].join("\n");
    const issues = rule.check(mkSubagent({ body }));
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("malformed-list");
    expect(issues[0].message).toContain("1, 2, 4");
  });

  test("fires on a list with a duplicate index (1, 2, 2, 3)", () => {
    const body = [
      "1. a",
      "2. b",
      "2. c",
      "3. d",
    ].join("\n");
    const issues = rule.check(mkSubagent({ body }));
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("1, 2, 2, 3");
  });

  test("does not fire on a clean 1..N sequence", () => {
    const body = [
      "1. a",
      "2. b",
      "3. c",
    ].join("\n");
    expect(rule.check(mkSubagent({ body }))).toEqual([]);
  });

  test("does not fire on a single-item run", () => {
    const body = "1. only one item";
    expect(rule.check(mkSubagent({ body }))).toEqual([]);
  });
});
