/**
 * Per-rule unit tests for `code-block-no-language`.
 *
 * Detection logic:
 *   - Fenced code blocks without a language tag fire IF they have ≥3 content lines.
 *   - Blocks with a language tag never fire.
 *   - Blocks with <3 content lines (one-liners, ASCII diagrams) never fire.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/code-block-no-language.js";
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

describe("code-block-no-language", () => {
  test("fires on a 3+ line fenced code block with no language tag", () => {
    const body = [
      "Run this:",
      "",
      "```",
      "const x = 1;",
      "const y = 2;",
      "console.log(x + y);",
      "```",
    ].join("\n");
    const issues = rule.check(mkSubagent({ body }));
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe("code-block-no-language");
  });

  test("does not fire when the code block has a language tag", () => {
    const body = [
      "```typescript",
      "const x = 1;",
      "const y = 2;",
      "console.log(x + y);",
      "```",
    ].join("\n");
    expect(rule.check(mkSubagent({ body }))).toEqual([]);
  });

  test("does not fire on short blocks (<3 content lines)", () => {
    const body = [
      "Inline:",
      "",
      "```",
      "echo hi",
      "```",
    ].join("\n");
    expect(rule.check(mkSubagent({ body }))).toEqual([]);
  });

  test("returns no issues for empty body", () => {
    expect(rule.check(mkSubagent({ body: "" }))).toEqual([]);
  });
});
