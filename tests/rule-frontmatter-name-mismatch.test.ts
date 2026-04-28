/**
 * Per-rule unit tests for `frontmatter-name-mismatch` (rebuilt in 0.2.2).
 *
 * 0.2.2 behaviour:
 *   - Severity downgraded from error -> suggestion (Claude Code routes
 *     by frontmatter `name`, not filename; mismatch is a smell, not a bug).
 *   - Comparison is slug-based: lowercase, runs of non-alphanumerics
 *     collapse to "-", trim. So "Expert React Engineer" matches
 *     "expert-react-engineer.md".
 *   - Multi-extension filenames like "foo.agent.md" (Cline/Cursor
 *     convention) strip the ecosystem suffix before comparing.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/frontmatter-name-mismatch.js";
import type { ParsedSubagent } from "../src/types.js";

function mkSubagent(path: string, name: string): ParsedSubagent {
  return {
    path,
    raw: "test",
    frontmatter: { name, description: "test" },
    body: "",
    bodyTokens: 0,
    parseErrors: [],
  };
}

describe("frontmatter-name-mismatch", () => {
  test("does not fire when name and filename are slug-equivalent", () => {
    expect(rule.check(mkSubagent("/foo/code-reviewer.md", "code-reviewer"))).toEqual([]);
  });

  test("does not fire when name has spaces but slugifies to filename slug", () => {
    expect(
      rule.check(mkSubagent("/foo/expert-react-engineer.md", "Expert React Engineer")),
    ).toEqual([]);
  });

  test("does not fire when filename uses .agent.md double-extension", () => {
    // The Cline / Cursor / VS Code agent ecosystem uses `.agent.md` and
    // we want to be lenient about it.
    expect(
      rule.check(
        mkSubagent("/foo/expert-react-engineer.agent.md", "Expert React Engineer"),
      ),
    ).toEqual([]);
  });

  test("does not fire on underscores vs hyphens (both slugify the same)", () => {
    expect(rule.check(mkSubagent("/foo/api_helper.md", "api-helper"))).toEqual([]);
  });

  test("fires when slugs genuinely differ", () => {
    const issues = rule.check(mkSubagent("/foo/code-reviewer.md", "secret-auditor"));
    expect(issues.length).toBe(1);
    expect(issues[0]!.severity).toBe("suggestion");
    expect(issues[0]!.message).toContain("secret-auditor");
    expect(issues[0]!.message).toContain("code-reviewer");
  });

  test("does not fire when frontmatter name is empty (other rules cover that)", () => {
    expect(rule.check(mkSubagent("/foo/code-reviewer.md", ""))).toEqual([]);
  });

  test("severity is suggestion (not error) — downgraded in 0.2.2", () => {
    expect(rule.defaultSeverity).toBe("suggestion");
  });

  test("fix-it suggests both directions of alignment", () => {
    const issues = rule.check(mkSubagent("/foo/secret-auditor.md", "Different Name"));
    expect(issues[0]!.fix).toMatch(/rename the file/i);
    expect(issues[0]!.fix).toMatch(/set frontmatter/i);
  });
});
