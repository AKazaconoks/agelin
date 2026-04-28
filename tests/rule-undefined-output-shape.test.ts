/**
 * Per-rule unit tests for `undefined-output-shape`.
 *
 * Detection paths:
 *   - Heading-based: e.g. `## Output Format`, `## Return`, `## Deliverable`.
 *   - Paragraph-based: phrases like "Return a JSON object", "Provide a markdown report".
 * Both are accepted as evidence the shape is defined.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/undefined-output-shape.js";
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

describe("undefined-output-shape", () => {
  test("fires when neither a heading nor a shape paragraph is present", () => {
    const sa = mkSubagent({
      body: "Analyze the situation thoroughly. Be exhaustive. Cover everything.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("undefined-output-shape");
  });

  test("does not fire when an `## Output` heading exists (heading-based)", () => {
    const sa = mkSubagent({
      body: "Some preamble.\n\n## Output\n\nA markdown report.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when a paragraph names a concrete shape (paragraph-based)", () => {
    const sa = mkSubagent({
      body: "Inspect the diff. Return a JSON object with fields: issues, summary, score.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("returns no issues for an empty body", () => {
    const sa = mkSubagent({ body: "" });
    expect(rule.check(sa)).toEqual([]);
  });
});
