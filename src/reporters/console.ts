/**
 * Console reporter. Renders a compact human-readable summary that matches
 * the README example output.
 *
 *   ✓ python-pro              Score: 87  (no static issues)
 *   ⚠ database-admin          Score: 62  (tool-overreach, no-exit-criteria)
 *   ✗ security-auditor        Score: 23  (injection-vector, cost-bomb)
 *
 *   3 agents checked, 2 issues, 1 critical
 */

import kleur from "kleur";
import type { AgentScore, Issue, ReportContext, Reporter } from "../types.js";

const NAME_WIDTH = 24;

function padName(name: string): string {
  if (name.length >= NAME_WIDTH) return name;
  return name + " ".repeat(NAME_WIDTH - name.length);
}

function topIssueIds(issues: Issue[], n: number): string[] {
  // dedupe by ruleId, preserve first-seen order. Append `:line` if the
  // issue carries a line number (some rules — code-block-no-language,
  // malformed-list, hardcoded-paths — do).
  const seen = new Map<string, Issue>();
  const order: string[] = [];
  for (const issue of issues) {
    if (seen.has(issue.ruleId)) continue;
    seen.set(issue.ruleId, issue);
    order.push(issue.ruleId);
    if (order.length >= n) break;
  }
  return order.map((id) => {
    const i = seen.get(id)!;
    return i.line !== undefined ? `${id}:${i.line}` : id;
  });
}

function statusFor(score: number, issues: Issue[]): {
  symbol: string;
  colorize: (s: string) => string;
} {
  if (score >= 80 && issues.length === 0) {
    return { symbol: "\u2713", colorize: (s) => kleur.green(s) };
  }
  if (score >= 50) {
    return { symbol: "\u26A0", colorize: (s) => kleur.yellow(s) };
  }
  return { symbol: "\u2717", colorize: (s) => kleur.red(s) };
}

function formatLine(result: AgentScore): string {
  const { symbol, colorize } = statusFor(result.score, result.staticIssues);
  const name = padName(result.agentName);
  const score = String(Math.round(result.score)).padStart(2);

  let suffix: string;
  if (result.staticIssues.length === 0) {
    suffix = "(no static issues)";
  } else {
    const ids = topIssueIds(result.staticIssues, 2);
    suffix = `(${ids.join(", ")})`;
  }

  return colorize(`${symbol} ${name}  Score: ${score}  ${suffix}`);
}

function isCritical(issue: Issue): boolean {
  return issue.severity === "error";
}

function render(ctx: ReportContext): string {
  const lines: string[] = [];

  for (const result of ctx.results) {
    lines.push(formatLine(result));
  }

  const totalAgents = ctx.results.length;
  const agentsWithIssues = ctx.results.filter((r) => r.staticIssues.length > 0).length;
  const criticalCount = ctx.results.reduce(
    (sum, r) => sum + r.staticIssues.filter(isCritical).length,
    0,
  );

  lines.push("");
  lines.push(
    `${totalAgents} agents checked, ${agentsWithIssues} issues, ${criticalCount} critical`,
  );

  return lines.join("\n");
}

const consoleReporter: Reporter = {
  name: "console",
  render,
};

export default consoleReporter;
