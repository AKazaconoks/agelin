/**
 * Per-rule unit tests for `vague-completion-criteria`.
 *
 * Detection logic:
 *   - Body must contain a vague exit phrase ("when you're done",
 *     "until satisfied", "as needed", "stop appropriately", ...).
 *   - The window around the match (±~150 chars) must NOT contain a concrete
 *     predicate (comparison op, back-ticked tool name, numeric threshold,
 *     deliverable noun like "tests pass").
 *
 * This rule complements `no-exit-criteria`: it fires only when an explicit
 * but vague exit phrase is present, not when there is none at all.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/vague-completion-criteria.js";
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

describe("vague-completion-criteria", () => {
  test("fires on 'when you're done' with no concrete predicate nearby", () => {
    const sa = mkSubagent({
      body: "Investigate the issue. Stop when you're done.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("vague-completion-criteria");
  });

  test("fires on 'as needed' phrasing", () => {
    const sa = mkSubagent({
      body: "Iterate as needed. Submit when ready.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBeGreaterThan(0);
  });

  test("does not fire when a concrete predicate (e.g. 'tests pass') is nearby", () => {
    const sa = mkSubagent({
      body: "Iterate until satisfied that all tests pass and the build succeeds.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when there is no explicit-exit phrase at all", () => {
    // Mitigation against overlap with `no-exit-criteria`: this rule
    // requires the agent to have an explicit (vague) exit clause.
    const sa = mkSubagent({
      body: "Investigate the issue and report findings.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when a back-ticked tool name appears nearby", () => {
    const sa = mkSubagent({
      body: "Stop when you're done invoking `Read` on the target files.",
    });
    expect(rule.check(sa)).toEqual([]);
  });
});
