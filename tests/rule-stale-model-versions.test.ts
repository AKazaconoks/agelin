/**
 * Per-rule unit tests for `stale-model-versions`.
 *
 * Detection logic:
 *   1. Frontmatter `model` field — single match.
 *   2. Body PROSE (code blocks stripped) — every distinct stale id, deduped.
 *
 * Stale list (as of 2026): claude-2, claude-instant, claude-3-opus,
 * claude-3-sonnet, claude-3-haiku, claude-3-5-sonnet, claude-3-5-haiku.
 * Current Claude 4 family aliases must NOT fire.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/stale-model-versions.js";
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

describe("stale-model-versions", () => {
  test("fires when frontmatter `model` is a stale id", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", model: "claude-3-opus" },
      body: "",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("stale-model-versions");
    expect(issues[0].message).toContain("claude-3-opus");
  });

  test("fires when the body prose names a stale id", () => {
    const sa = mkSubagent({
      body: "This prompt was originally tuned for claude-3-5-sonnet behaviour.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("claude-3-5-sonnet");
  });

  test("does not fire on current Claude 4 model aliases", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", model: "claude-sonnet-4-6" },
      body: "Use claude-haiku-4-5 for cheap turns.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on stale ids inside code blocks (prose-only check)", () => {
    const body = [
      "Migration sample:",
      "",
      "```yaml",
      "model: claude-3-opus",
      "```",
    ].join("\n");
    expect(rule.check(mkSubagent({ body }))).toEqual([]);
  });
});
