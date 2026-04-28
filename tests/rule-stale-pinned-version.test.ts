/**
 * Per-rule unit tests for `stale-pinned-version`.
 *
 * Detection logic:
 *   1. Description AND body prose are scanned (code blocks stripped).
 *   2. Match `<framework> <major>` against curated VERSION_KB.
 *   3. Flag if matched major is strictly below the entry's `flagBelow`.
 *
 * KB curation cadence: ~6 months. See header of stale-pinned-version.ts.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/stale-pinned-version.js";
import type { ParsedSubagent } from "../src/types.js";

function mkSubagent(opts: {
  description?: string;
  body?: string;
}): ParsedSubagent {
  const body = opts.body ?? "";
  return {
    path: "test.md",
    raw: "test",
    frontmatter: { name: "test", description: opts.description ?? "test" },
    body,
    bodyTokens: Math.ceil(body.length / 4),
    parseErrors: [],
    ast: undefined,
  };
}

describe("stale-pinned-version", () => {
  test("fires on 'Angular 15+' (current major: 19)", () => {
    const sa = mkSubagent({
      description: "Angular architect with expertise in Angular 15+",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("stale-pinned-version");
    expect(issues[0].message.toLowerCase()).toContain("angular");
    expect(issues[0].message).toContain("15");
  });

  test("fires on 'Electron 27+'", () => {
    const sa = mkSubagent({ description: "Use when working with Electron 27+." });
    expect(rule.check(sa).length).toBe(1);
  });

  test("does not fire on current Angular 19", () => {
    const sa = mkSubagent({
      description: "Angular architect with expertise in Angular 19+",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on current React 19", () => {
    const sa = mkSubagent({
      description: "Use when scaffolding a React 19 application with server components.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("scans body prose, not just description", () => {
    const sa = mkSubagent({
      description: "Use when upgrading a legacy frontend.",
      body: "The target stack is Angular 14 with RxJS 7.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain("14");
  });

  test("does not fire on stale versions inside fenced code blocks", () => {
    const body = [
      "Migration guide:",
      "",
      "```yaml",
      "framework: Angular 14",
      "```",
      "",
      "Use this for the upgrade.",
    ].join("\n");
    expect(rule.check(mkSubagent({ body }))).toEqual([]);
  });

  test("dedupes identical pins between description and body", () => {
    const sa = mkSubagent({
      description: "Angular 15+ specialist.",
      body: "Use Angular 15 features such as standalone components.",
    });
    expect(rule.check(sa).length).toBe(1);
  });

  test("flags multiple distinct stale frameworks separately", () => {
    const sa = mkSubagent({
      description: "Use when the user works with Angular 14 and Electron 25.",
    });
    const issues = rule.check(sa);
    expect(issues.length).toBe(2);
  });

  test("ignores unrelated 'X N' phrases", () => {
    const sa = mkSubagent({
      description: "Use when the user has 14 outstanding PRs to review.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on Vue 3 (current)", () => {
    const sa = mkSubagent({ description: "Use for Vue 3 component refactors." });
    expect(rule.check(sa)).toEqual([]);
  });
});
