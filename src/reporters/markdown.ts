/**
 * Markdown reporter. Renders a leaderboard table sorted by score desc.
 * Suitable for pasting into a PR description or a GitHub issue.
 */

import type { AgentScore, ReportContext, Reporter } from "../types.js";

function escapePipes(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function formatIssues(result: AgentScore): string {
  if (result.staticIssues.length === 0) return "none";
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const issue of result.staticIssues) {
    if (seen.has(issue.ruleId)) continue;
    seen.add(issue.ruleId);
    ids.push(issue.ruleId);
  }
  return ids.join(", ");
}

const markdownReporter: Reporter = {
  name: "markdown",
  render(ctx: ReportContext): string {
    const sorted = [...ctx.results].sort((a, b) => b.score - a.score);

    const lines: string[] = [];
    lines.push("# agelin report");
    lines.push("");
    lines.push(`Generated: ${ctx.generatedAt}`);
    lines.push("");
    lines.push("| Rank | Agent | Score | Issues |");
    lines.push("|------|-------|-------|--------|");

    sorted.forEach((result, i) => {
      const rank = i + 1;
      const name = escapePipes(result.agentName);
      const score = Math.round(result.score);
      const issues = escapePipes(formatIssues(result));
      lines.push(`| ${rank} | ${name} | ${score} | ${issues} |`);
    });

    return lines.join("\n");
  },
};

export default markdownReporter;
