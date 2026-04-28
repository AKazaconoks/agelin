/**
 * Per-rule unit tests for `unknown-tool` (rebuilt in 0.2.2).
 *
 * The rule now emits AT MOST ONE issue per agent — a coalesced summary
 * with up to 8 names listed and an overflow count, plus an authoritative
 * docs URL. Pre-0.2.2 behaviour (one issue per unknown tool, each
 * repeating the full canonical list) is gone.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/unknown-tool.js";
import type { ParsedSubagent } from "../src/types.js";

function mkSubagent(tools: unknown): ParsedSubagent {
  return {
    path: "test.md",
    raw: "test",
    frontmatter: { name: "test", description: "test", tools: tools as never },
    body: "",
    bodyTokens: 0,
    parseErrors: [],
  };
}

describe("unknown-tool", () => {
  test("does not fire when every tool is canonical", () => {
    const sa = mkSubagent(["Read", "Write", "Bash"]);
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when tools field is missing (inherited)", () => {
    const sa = mkSubagent(undefined);
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on MCP-shaped tool names", () => {
    const sa = mkSubagent([
      "Read",
      "mcp__github__list_issues",
      "mcp__slack__post_message",
    ]);
    expect(rule.check(sa)).toEqual([]);
  });

  test("emits a single coalesced issue when multiple tools are unknown", () => {
    const sa = mkSubagent(["Read", "changes", "codebase", "search", "fetch"]);
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe("unknown-tool");
    // Count is honest:
    expect(issue.message).toContain("4 unrecognised tools");
    // Names are present in the preview:
    expect(issue.message).toContain('"changes"');
    expect(issue.message).toContain('"codebase"');
    expect(issue.message).toContain('"search"');
    expect(issue.message).toContain('"fetch"');
    // The canonical 17-name list MUST NOT be pasted in the message anymore.
    expect(issue.message).not.toContain("MultiEdit, Bash");
    // docUrl points at Anthropic's docs.
    expect(issue.docUrl).toMatch(/docs\.claude\.com/);
  });

  test("collapses 20+ unknowns to a preview with overflow count", () => {
    const tools = Array.from({ length: 22 }, (_, i) => `bogus${i}`);
    const issues = rule.check(mkSubagent(tools));
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("22 unrecognised tools");
    // Preview limit is 8; +14 should be marked as overflow.
    expect(issues[0]!.message).toContain("+14 more");
  });

  test("singular wording for exactly one unknown tool", () => {
    const issues = rule.check(mkSubagent(["Read", "fetch"]));
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("1 unrecognised tool:");
    expect(issues[0]!.message).not.toContain("tools:");
  });

  test("fix-it points at MCP shape and the cross-ecosystem case", () => {
    const issues = rule.check(mkSubagent(["fetch"]));
    expect(issues[0]!.fix).toMatch(/mcp__<server>__<tool>/);
    expect(issues[0]!.fix).toMatch(/Cline|Cursor|Copilot/);
  });
});
