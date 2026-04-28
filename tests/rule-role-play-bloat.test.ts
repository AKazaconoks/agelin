/**
 * Per-rule unit tests for `role-play-bloat` (refined in 0.2.2).
 *
 * 0.2.2 changes:
 *   - Dropped the 2023 arxiv docUrl. Folklore on persona prefixes is
 *     now widely accepted and a single 2023 paper isn't the right
 *     citation. A future agelin docs page will replace it.
 *   - Softened the message: "doesn't reliably benefit" instead of
 *     "wastes tokens / doesn't improve accuracy."
 *   - Body of the rule still scans only the first 400 chars (where
 *     persona prefixes live).
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/role-play-bloat.js";
import type { ParsedSubagent } from "../src/types.js";

function mkSubagent(body: string): ParsedSubagent {
  return {
    path: "test.md",
    raw: body,
    frontmatter: { name: "test", description: "test" },
    body,
    bodyTokens: Math.ceil(body.length / 4),
    parseErrors: [],
  };
}

describe("role-play-bloat", () => {
  test("fires on 'world-class' opener", () => {
    const issues = rule.check(
      mkSubagent("You are a world-class engineer who writes Python. ..."),
    );
    expect(issues.length).toBe(1);
    expect(issues[0]!.severity).toBe("suggestion");
    expect(issues[0]!.message).toContain("world-class");
  });

  test("fires on '10x rockstar'", () => {
    const issues = rule.check(
      mkSubagent("You are a 10x developer with deep knowledge..."),
    );
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("10x");
  });

  test("fires on 'expert with N years'", () => {
    const issues = rule.check(
      mkSubagent("You are an expert with 30 years of experience in compilers..."),
    );
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("years");
  });

  test("does not fire on a concrete task description", () => {
    expect(
      rule.check(
        mkSubagent(
          "When invoked, read the supplied source files and report any unused imports.",
        ),
      ),
    ).toEqual([]);
  });

  test("only scans the first ~400 chars (no false-fire on quoted hype later)", () => {
    const body =
      "When invoked, read the supplied files and report findings. ".repeat(20) +
      "Note: the user may describe themselves as a 'world-class engineer' — that's fine.";
    expect(rule.check(mkSubagent(body))).toEqual([]);
  });

  test("does not include the dropped 2023 arxiv link", () => {
    const issues = rule.check(mkSubagent("You are a world-class engineer..."));
    expect(issues[0]!.docUrl).toBeUndefined();
  });

  test("fix-it advises a concrete task description, not a softer persona", () => {
    const issues = rule.check(mkSubagent("You are a 10x developer..."));
    expect(issues[0]!.fix).toMatch(/concrete task description/i);
    expect(issues[0]!.fix).toMatch(/When invoked/);
  });

  test("only one issue per body even if multiple hype phrases are present", () => {
    // Pre-0.2.2 the rule already returned on first match; preserve that.
    const issues = rule.check(
      mkSubagent("You are a world-class 10x rockstar genius engineer..."),
    );
    expect(issues.length).toBe(1);
  });
});
