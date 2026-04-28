/**
 * Per-rule unit tests for `tool-body-mismatch`.
 *
 * Detection logic (see src/rules/tool-body-mismatch.ts):
 *   - Skip if tools-source is `missing` (inherited).
 *   - Skip MCP tools (`mcp__server__tool`).
 *   - For each declared canonical tool, accept either a literal mention by
 *     name OR a synonymous "implicit usage" verb (e.g. "read" for Read).
 *   - Otherwise emit one suggestion per orphan tool.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/tool-body-mismatch.js";
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

describe("tool-body-mismatch", () => {
  test("fires when a declared tool is neither named nor implied", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["WebFetch"] },
      body: "This agent reviews the codebase and produces a report.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].ruleId).toBe("tool-body-mismatch");
    expect(issues[0].message).toContain("WebFetch");
  });

  test("does not fire when the body literally names the tool", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["WebFetch"] },
      body: "When the user provides a URL, call WebFetch on it and summarise the response.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when an implicit-usage verb is present (Read -> 'read')", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Read"] },
      body: "Read the source file the user references and summarise it.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire for MCP tools regardless of body content", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["mcp__supabase__query"] },
      body: "Pure prose with no implicit usage verbs at all here.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire when tools field is missing (inherited)", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t" },
      body: "Pure prose with nothing to see here.",
    });
    expect(rule.check(sa)).toEqual([]);
  });
});
