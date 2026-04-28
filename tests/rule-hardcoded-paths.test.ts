/**
 * Per-rule unit tests for `hardcoded-paths`.
 *
 * Detection logic:
 *   - Match user-specific paths in PROSE only (code blocks are stripped first).
 *   - Patterns: /home/<name>/, /Users/<Name>/, C:\Users\<Name>\, /root/.
 *   - Whitelist common placeholders: <user>, username, you, yourname, name, etc.
 */

import { describe, expect, test } from "bun:test";
import rule from "../src/rules/hardcoded-paths.js";
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

describe("hardcoded-paths", () => {
  test("fires on a Linux user home path in prose", () => {
    const sa = mkSubagent({ body: "Read the config from /home/alice/config.toml on startup." });
    const issues = rule.check(sa);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].ruleId).toBe("hardcoded-paths");
    expect(issues[0].message).toContain("/home/alice/");
  });

  test("fires on a Windows user home path in prose", () => {
    const sa = mkSubagent({ body: "Logs live in C:\\Users\\Bob\\AppData\\Local\\Logs." });
    const issues = rule.check(sa);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].message).toContain("C:\\Users\\Bob\\");
  });

  test("does not fire on hardcoded paths inside fenced code blocks", () => {
    const body = [
      "Example invocation:",
      "",
      "```bash",
      "cat /home/alice/config.toml",
      "```",
    ].join("\n");
    expect(rule.check(mkSubagent({ body }))).toEqual([]);
  });

  test("does not fire on placeholder paths like /home/user/", () => {
    const sa = mkSubagent({
      body: "By convention the project lives under /home/user/projects/<repo>.",
    });
    expect(rule.check(sa)).toEqual([]);
  });

  test("does not fire on `~` or `$HOME` portable paths", () => {
    const sa = mkSubagent({
      body: "Use ~/.config/myapp/ or $HOME/.config/myapp/ for the config file.",
    });
    expect(rule.check(sa)).toEqual([]);
  });
});
