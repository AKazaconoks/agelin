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

  // 0.2.2 — Read's IMPLICIT_USAGE was expanded after the wild-corpus
  // audit. These verbs all imply reading/inspection in real subagent
  // bodies and should now suppress the false positive.
  test("Read accepts 'analyze' as an implicit-usage verb (0.2.2)", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Read"] },
      body: "When invoked, analyze the supplied source files and report findings.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("Read accepts 'review' as implicit-usage", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Read"] },
      body: "You review the user's pull request and surface any issues.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("Read accepts 'check' / 'parse' / 'study' / 'scan'", () => {
    for (const verb of ["check", "parse", "study", "scan"]) {
      const sa = mkSubagent({
        frontmatter: { name: "t", description: "t", tools: ["Read"] },
        body: `When invoked, ${verb} the user's submitted file.`,
      });
      expect(rule.check(sa)).toEqual([]);
    }
  });

  test("Read accepts 'source files' phrasing", () => {
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Read"] },
      body: "Inspect the project's source files and produce a report.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("Glob still fires when nothing implies file-listing (audit confirmed legit signal)", () => {
    // The corpus audit showed Glob's implicit-usage table is correctly
    // narrow — 60/97 wild agents over-declare it. Don't loosen.
    const sa = mkSubagent({
      frontmatter: { name: "t", description: "t", tools: ["Glob"] },
      body: "Read the supplied file and produce a one-paragraph summary.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0]!.message).toContain("Glob");
  });
});
