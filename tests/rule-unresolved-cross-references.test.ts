/**
 * Per-rule unit tests for `unresolved-cross-references`.
 *
 * Detection rules:
 *   - Skip if `tools` field is missing (inherited tools — Task may be available).
 *   - Skip if `Task` is in the declared tools (cross-references resolvable).
 *   - Otherwise look for `@agent-name` mentions or phrases like
 *     "delegate to X", "use the X agent", "pass to X", "hand off to X".
 *   - JSDoc-like tags (`@param`, `@returns`, `@example`, ...) are excluded.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/unresolved-cross-references.js";
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

describe("unresolved-cross-references", () => {
  test("fires on `@agent-name` mention with no Task tool", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Read"] },
      body: "When the security review is needed, hand it off to @security-auditor.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("unresolved-cross-references");
  });

  test("does not fire when Task is declared in frontmatter tools", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Read", "Task"] },
      body: "Delegate to security-auditor and use the code-reviewer agent.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on JSDoc tags like @param and @returns", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Read"] },
      body: "Notes on the helper:\n\n@param input — the user message\n@returns the parsed result\n@throws TypeError when input is null.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when tools field is missing (inherited)", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t" },
      body: "Delegate to @other-agent for the heavy lifting.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("fires on phrase patterns (e.g. 'delegate to X') even without @ mention", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Read"] },
      body: "If the diff is large, delegate to perf-reviewer for benchmarking.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("perf-reviewer");
  });
});
