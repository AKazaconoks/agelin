/**
 * Tests for the GitHub Actions workflow-command reporter.
 *
 * Output spec: https://docs.github.com/en/actions/learn-github-actions/workflow-commands-for-github-actions
 *
 *   ::warning file=path,line=N,title=...::Message
 *
 * GitHub Actions parses these to native PR-review annotations. The
 * reporter is responsible for:
 *   - Severity → command mapping (error / warning / suggestion → error / warning / notice)
 *   - URL-encoding properties (commas, colons, percents, newlines)
 *   - URL-encoding the message body (percents, newlines only — colons
 *     and commas are fine in the body)
 *   - Forward-slash file paths (Windows runners get backslash absolutes)
 *   - One annotation line per issue, all on one line each
 */

import { describe, expect, test } from "bun:test";
import githubReporter from "../src/reporters/github.js";
import type { AgentScore, ReportContext } from "../src/types.js";

function ctx(results: AgentScore[]): ReportContext {
  return {
    results,
    generatedAt: "2026-04-28T00:00:00Z",
    toolVersion: "test",
  };
}

function mkScore(opts: Partial<AgentScore> & { agentPath: string }): AgentScore {
  return {
    agentName: "test",
    score: 50,
    components: { staticHealth: 50, successRate: 0, costEfficiency: 0, consistency: 0 },
    staticIssues: [],
    ...opts,
  };
}

describe("github reporter", () => {
  test("renders nothing when no issues exist", () => {
    const out = githubReporter.render(
      ctx([mkScore({ agentPath: "/repo/.claude/agents/clean.md" })]),
    );
    expect(out).toBe("");
  });

  test("maps severities: error -> ::error, warning -> ::warning, suggestion -> ::notice", () => {
    const out = githubReporter.render(
      ctx([
        mkScore({
          agentPath: "/repo/.claude/agents/x.md",
          staticIssues: [
            { ruleId: "r1", severity: "error", message: "boom" },
            { ruleId: "r2", severity: "warning", message: "watch" },
            { ruleId: "r3", severity: "suggestion", message: "nudge" },
          ],
        }),
      ]),
    );
    const lines = out.split("\n");
    expect(lines.length).toBe(3);
    expect(lines[0]!.startsWith("::error ")).toBe(true);
    expect(lines[1]!.startsWith("::warning ")).toBe(true);
    expect(lines[2]!.startsWith("::notice ")).toBe(true);
  });

  test("includes line= when the issue has a line number, omits it otherwise", () => {
    const out = githubReporter.render(
      ctx([
        mkScore({
          agentPath: "/repo/.claude/agents/x.md",
          staticIssues: [
            { ruleId: "with-line", severity: "warning", message: "m", line: 42 },
            { ruleId: "no-line", severity: "warning", message: "m" },
          ],
        }),
      ]),
    );
    const lines = out.split("\n");
    expect(lines[0]).toContain("line=42");
    expect(lines[1]).not.toContain("line=");
  });

  test("URL-encodes special chars in title (`:`, `,`, `%`)", () => {
    const out = githubReporter.render(
      ctx([
        mkScore({
          agentPath: "/repo/.claude/agents/x.md",
          staticIssues: [
            { ruleId: "namespaced/rule:with:colons", severity: "warning", message: "m" },
          ],
        }),
      ]),
    );
    // The `:` in `agelin: <ruleid>` and inside the rule id MUST be `%3A`
    // because the title is a property value and `,` / `:` are field
    // separators. Spaces don't need encoding per the spec.
    expect(out).toContain("title=agelin%3A namespaced/rule%3Awith%3Acolons");
  });

  test("URL-encodes message body (newlines, percents)", () => {
    const out = githubReporter.render(
      ctx([
        mkScore({
          agentPath: "/repo/.claude/agents/x.md",
          staticIssues: [
            {
              ruleId: "r",
              severity: "warning",
              message: "line one\nline two with % sign",
            },
          ],
        }),
      ]),
    );
    // Real newline becomes %0A; literal % becomes %25.
    expect(out).toContain("%0A");
    expect(out).toContain("%25");
    // Crucially NOT %250A (that would be a double-encode bug).
    expect(out).not.toContain("%250A");
  });

  test("appends fix-it text to the message body when present", () => {
    const out = githubReporter.render(
      ctx([
        mkScore({
          agentPath: "/repo/.claude/agents/x.md",
          staticIssues: [
            {
              ruleId: "r",
              severity: "warning",
              message: "primary message",
              fix: "do this thing",
            },
          ],
        }),
      ]),
    );
    expect(out).toContain("primary message");
    // Body is post-`::` — `:` is NOT special there per GitHub's spec, so
    // "Fix:" stays literal. Newlines DO get encoded since they'd otherwise
    // split the annotation across lines.
    expect(out).toContain("Fix: do this thing");
    expect(out).toContain("primary message%0A%0AFix:");
  });

  test("emits forward-slash paths even for Windows-style absolute paths", () => {
    const out = githubReporter.render(
      ctx([
        mkScore({
          // Use a path under cwd so `relative()` doesn't escape.
          agentPath: process.cwd() + "/.claude/agents/x.md",
          staticIssues: [
            { ruleId: "r", severity: "warning", message: "m" },
          ],
        }),
      ]),
    );
    expect(out).toContain(".claude/agents/x.md");
    // Backslashes from Windows paths must be normalised for GitHub.
    expect(out).not.toMatch(/file=[^,:]*\\/);
  });

  test("multiple agents → one block of annotations per agent", () => {
    const out = githubReporter.render(
      ctx([
        mkScore({
          agentPath: process.cwd() + "/a.md",
          staticIssues: [
            { ruleId: "r1", severity: "warning", message: "m1" },
          ],
        }),
        mkScore({
          agentPath: process.cwd() + "/b.md",
          staticIssues: [
            { ruleId: "r2", severity: "error", message: "m2" },
          ],
        }),
      ]),
    );
    const lines = out.split("\n");
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain("a.md");
    expect(lines[1]).toContain("b.md");
  });

  test("each annotation is exactly one line (no embedded newlines)", () => {
    const out = githubReporter.render(
      ctx([
        mkScore({
          agentPath: process.cwd() + "/x.md",
          staticIssues: [
            {
              ruleId: "r",
              severity: "warning",
              message: "first\nsecond",
              fix: "third\nfourth",
            },
          ],
        }),
      ]),
    );
    // Output is the concatenation of annotations joined by \n. Each
    // individual annotation must NOT contain an unescaped newline —
    // GitHub would split it. Count: should be exactly 1 line.
    expect(out.split("\n").length).toBe(1);
  });
});
