/**
 * Per-rule unit tests for `missing-input-preconditions`.
 *
 * Detection paths:
 *   - Heading-based: `## Inputs`, `## Preconditions`, `## Expects`, etc.
 *   - Phrase-based: "you will be given", "you receive", "the user provides", etc.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/missing-input-preconditions.js";
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

// A long body lacking inputs section/phrase — > 1200 tokens.
const LONG_BODY_NO_INPUTS =
  "Carry out an investigation. Report back when finished. ".repeat(100);

describe("missing-input-preconditions", () => {
  test("fires when body is long (>1200 tokens) and lacks inputs heading + phrase", () => {
    const sa = mkSubagent({ body: LONG_BODY_NO_INPUTS });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("missing-input-preconditions");
  });

  test("does NOT fire on a short body (<=1200 tokens), even without inputs section — added in 0.5.0 per phase-2 case study", () => {
    const sa = mkSubagent({
      body: "Carry out an investigation. Report back when finished.",
    });
    const issues = rule.check(sa);
    expect(issues).toEqual([]);
  });

  test("does not fire when an `## Inputs` heading exists (heading-based, long body)", () => {
    const sa = mkSubagent({
      body: LONG_BODY_NO_INPUTS + "\n\n## Inputs\n\nA stack trace and the source file.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when a phrase like 'you will be given' appears (long body)", () => {
    const sa = mkSubagent({
      body:
        LONG_BODY_NO_INPUTS +
        "\nYou will be given a stack trace and the relevant source file. Diagnose the bug.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when a `## Preconditions` heading exists (heading-based, long body)", () => {
    const sa = mkSubagent({
      body:
        "## Preconditions\n\nThe agent runs after lint passes.\n\nThen do work.\n\n" +
        LONG_BODY_NO_INPUTS,
    });
    expect(rule.check(sa)).toEqual([]);
  });
});
