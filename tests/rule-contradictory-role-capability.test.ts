/**
 * Per-rule unit tests for `contradictory-role-capability`.
 *
 * Detection requires ALL THREE signals:
 *   1. Restrictive role phrase in description OR first body paragraph.
 *   2. Declared tools include a write/exec capability.
 *   3. Body prose contains an action verb implying mutation/execution.
 *
 * Edge case: the rule must NOT fire on only 2 of 3 signals.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/contradictory-role-capability.js";
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

describe("contradictory-role-capability", () => {
  test("fires when all three signals align (description + write tool + action verb)", () => {
    const sa = mkSubagent({
      frontmatter: {
        name: "auditor",
        description: "Read-only code auditor. Review only.",
        tools: ["Read", "Edit", "Bash"],
      },
      body: "After reviewing, apply the fix to the offending file and commit the change.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("contradictory-role-capability");
    expect(issues[0].severity).toBe("error");
  });

  test("does not fire on the canonical clean case (no contradictions)", () => {
    const sa = mkSubagent({
      frontmatter: {
        name: "fixer",
        description: "Fixes bugs by editing source files.",
        tools: ["Read", "Edit"],
      },
      body: "Locate the bug and apply the fix.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when only 2 of 3 signals are present (read-only role + write tool, no action verbs)", () => {
    const sa = mkSubagent({
      frontmatter: {
        name: "auditor",
        description: "Read-only auditor. Review only.",
        tools: ["Read", "Edit"],
      },
      // No action verbs from ACTION_VERB_PHRASES list.
      body: "Inspect the source. Note any bugs you observe.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when role-restriction phrase is missing", () => {
    const sa = mkSubagent({
      frontmatter: {
        name: "fixer",
        description: "Fixes bugs in the codebase.",
        tools: ["Edit", "Bash"],
      },
      body: "Apply the fix and run npm install if needed.",
    });
    expect(rule.check(sa)).toEqual([]);
  });
});
