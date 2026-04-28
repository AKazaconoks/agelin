/**
 * Verifies `printRules()` writes every registered rule to stdout in the
 * documented `<id>  [<severity>]  <description>` format.
 */

import { describe, expect, test } from "bun:test";
import { printRules } from "../src/cli/rules.js";
import { ALL_RULES } from "../src/rules/index.js";

function captureStdout(fn: () => void): string {
  const original = console.log;
  const lines: string[] = [];
  console.log = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(" "));
  };
  try {
    fn();
  } finally {
    console.log = original;
  }
  return lines.join("\n");
}

describe("printRules", () => {
  test("output contains every registered rule id", () => {
    const output = captureStdout(() => printRules());
    for (const rule of ALL_RULES) {
      expect(output).toContain(rule.id);
    }
  });

  test("each line is `<id>  [<severity>]  <description>`", () => {
    const output = captureStdout(() => printRules());
    const lines = output.split("\n");
    expect(lines.length).toBe(ALL_RULES.length);
    for (const line of lines) {
      // matches: id (kebab-case) + spaces + [severity] + spaces + description
      expect(line).toMatch(
        /^[a-z][a-z0-9-]*\s+\[(error|warning|suggestion)\]\s+\S/,
      );
    }
  });

  test("rules are sorted by id", () => {
    const output = captureStdout(() => printRules());
    const ids = output
      .split("\n")
      .map((l) => l.split(/\s+/)[0])
      .filter((s): s is string => Boolean(s));
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });
});
