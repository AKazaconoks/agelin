/**
 * Per-rule unit tests for `no-examples`.
 *
 * 0.5.0 raised the firing threshold from 300 → 1200 tokens after the
 * phase-2 case study showed mandating examples on already-concise agents
 * inflates response length without improving quality (`node-specialist`
 * regression). These tests cover the new behavior at both sides of the
 * threshold.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/no-examples.js";
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

// > 1200 tokens of prose with no fence, no Example heading.
const LONG_BODY_NO_EXAMPLE =
  "Investigate the issue carefully and propose a fix. Document your reasoning. ".repeat(
    80,
  );

describe("no-examples", () => {
  test("fires when body is long (>1200 tokens) and has no fence or Example heading", () => {
    const sa = mkSubagent({ body: LONG_BODY_NO_EXAMPLE });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("no-examples");
  });

  test("does NOT fire on a short body (<=1200 tokens) — added in 0.5.0 per phase-2 case study", () => {
    const sa = mkSubagent({
      body: "Investigate the issue and propose a fix. Be concise.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when a code fence is present (long body)", () => {
    const sa = mkSubagent({
      body: LONG_BODY_NO_EXAMPLE + "\n\n```\nfoo()\n```\n",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when an Example heading is present (long body)", () => {
    const sa = mkSubagent({
      body: LONG_BODY_NO_EXAMPLE + "\n\n## Example\n\nInput foo, output bar.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("returns no issues for an empty body", () => {
    const sa = mkSubagent({ body: "" });
    expect(rule.check(sa)).toEqual([]);
  });
});
