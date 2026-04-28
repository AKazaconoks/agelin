/**
 * Browser-bundle entry point for the playground at site/playground.html.
 *
 * Exposes a single `lintPlayground(raw)` function that takes the markdown
 * source of one subagent and returns a scored, sorted issue list. No
 * filesystem, no Node APIs — esbuild/bun-build pulls in only what
 * `parseSubagentFromString` + `ALL_RULES` + `computeAgentScore` need.
 *
 * The bundle attaches the API to `window.agelin` so the HTML page can
 * call it without import wrangling.
 */

import { parseSubagentFromString } from "../parser/parse.js";
import { ALL_RULES } from "../rules/index.js";
import { computeAgentScore } from "../scoring/index.js";
import type { Issue } from "../types.js";

export interface PlaygroundResult {
  /** 0-100 static-only score from `computeAgentScore`. */
  score: number;
  /** Resolved frontmatter `name`, or `(unnamed)` if missing/unparseable. */
  agentName: string;
  /** Every issue surfaced — rule violations + synthesised parse-errors. */
  issues: Issue[];
  /** Issues per severity, for the summary bar. */
  totals: { error: number; warning: number; suggestion: number };
}

export function lintPlayground(raw: string): PlaygroundResult {
  const subagent = parseSubagentFromString(raw, "<playground>.md");

  const issues: Issue[] = [];

  // Parse errors first (the user wants to see "your YAML is broken"
  // before any rule firings, which would all be false-positives).
  for (const pe of subagent.parseErrors) {
    issues.push({ ruleId: "parse-error", severity: "error", message: pe });
  }

  for (const rule of ALL_RULES) {
    try {
      issues.push(...rule.check(subagent));
    } catch (err) {
      // A buggy rule shouldn't take down the playground; surface a
      // friendly diagnostic and keep going.
      issues.push({
        ruleId: rule.id,
        severity: "warning",
        message: `Rule ${rule.id} threw: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Sort: errors first, then warnings, then suggestions; within a
  // severity, by line number ascending then ruleId.
  const sevRank: Record<Issue["severity"], number> = {
    error: 0,
    warning: 1,
    suggestion: 2,
  };
  issues.sort((a, b) => {
    const s = sevRank[a.severity] - sevRank[b.severity];
    if (s !== 0) return s;
    const la = a.line ?? Number.POSITIVE_INFINITY;
    const lb = b.line ?? Number.POSITIVE_INFINITY;
    if (la !== lb) return la - lb;
    return a.ruleId.localeCompare(b.ruleId);
  });

  const totals = { error: 0, warning: 0, suggestion: 0 };
  for (const i of issues) totals[i.severity] += 1;

  const scored = computeAgentScore(subagent, issues, []);

  return {
    score: scored.score,
    agentName: subagent.frontmatter.name || "(unnamed)",
    issues,
    totals,
  };
}

// Side-effect: install on the window so the HTML page can call it
// without a separate import statement. Wrapped in `globalThis` for
// the SSR / Node-test edge case (tree-shaken in browser builds anyway).
type GlobalWithAgelin = typeof globalThis & {
  agelin?: { lintPlayground: typeof lintPlayground };
};
(globalThis as GlobalWithAgelin).agelin = { lintPlayground };
