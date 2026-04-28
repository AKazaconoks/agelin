/**
 * Console reporter.
 *
 * Two modes:
 *
 *   - **Summary** (default for multi-agent runs): one line per agent with
 *     score and the top two firing rules. Compact, scrollable.
 *
 *       ✓ python-pro              Score: 87  (no static issues)
 *       ⚠ database-admin          Score: 62  (tool-overreach, no-exit-criteria)
 *       ✗ security-auditor        Score: 23  (injection-vector, cost-bomb)
 *
 *   - **Verbose** (auto when checking a single agent, or via `--verbose`):
 *     full message and fix-it hint per issue, grouped under each agent.
 *
 *       ✗ security-auditor  Score: 23
 *
 *         [error]   tool-overreach
 *           description claims read-only review but tools include Edit/Bash.
 *           fix: Remove Edit/Bash from `tools`, or update the description.
 *
 *         [warning] no-exit-criteria
 *           agent body never declares a stopping condition.
 *           fix: Add an `## Exit criteria` section with a concrete predicate.
 *
 * Both modes end with a one-line totals row, plus a hint that points at
 * `agelin fix` when at least one auto-fixable issue was found.
 */

import kleur from "kleur";
import type { AgentScore, Issue, ReportContext, Reporter } from "../types.js";

const NAME_WIDTH = 24;

// Rules with a registered auto-fix in `src/cli/fix.ts`. Surfaced as a
// hint when summary output contains any of them. Keep in sync with the
// fixer registry — drift here is a UX bug, not a correctness bug.
const AUTOFIXABLE = new Set<string>([
  "tools-as-string-not-array",
  "code-block-no-language",
  "malformed-list",
  "hardcoded-paths",
]);

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

function statusFor(
  score: number,
  issues: Issue[],
): {
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

function colorizeSeverity(severity: Issue["severity"], text: string): string {
  switch (severity) {
    case "error":
      return kleur.red(text);
    case "warning":
      return kleur.yellow(text);
    case "suggestion":
      return kleur.cyan(text);
  }
}

function formatSummaryLine(result: AgentScore): string {
  const { symbol, colorize } = statusFor(result.score, result.staticIssues);
  const name = padName(result.agentName);
  const score = String(Math.round(result.score)).padStart(2);

  let suffix: string;
  if (result.staticIssues.length === 0) {
    suffix = "(no static issues)";
  } else {
    const ids = topIssueIds(result.staticIssues, 2);
    const more = result.staticIssues.length > 2 ? `, +${result.staticIssues.length - 2} more` : "";
    suffix = `(${ids.join(", ")}${more})`;
  }

  return colorize(`${symbol} ${name}  Score: ${score}  ${suffix}`);
}

function formatVerboseAgent(result: AgentScore): string[] {
  const { symbol, colorize } = statusFor(result.score, result.staticIssues);
  const score = String(Math.round(result.score));
  const lines: string[] = [];
  lines.push(colorize(`${symbol} ${result.agentName}  Score: ${score}`));

  if (result.staticIssues.length === 0) {
    lines.push("  " + kleur.dim("no static issues"));
    return lines;
  }

  // Group by ruleId so a rule that fires multiple times (e.g.
  // tool-body-mismatch hitting three tools) appears once with the
  // distinct messages stacked underneath.
  const byRule = new Map<string, Issue[]>();
  for (const issue of result.staticIssues) {
    const arr = byRule.get(issue.ruleId);
    if (arr) arr.push(issue);
    else byRule.set(issue.ruleId, [issue]);
  }

  const SEV_WIDTH = 11; // "[suggestion]" = 12, "[warning]   " = 11; pad uniformly
  for (const [ruleId, issues] of byRule) {
    const first = issues[0]!;
    const sevTag = colorizeSeverity(
      first.severity,
      `[${first.severity}]`.padEnd(SEV_WIDTH),
    );
    const lineSuffix = first.line !== undefined ? kleur.dim(` (line ${first.line})`) : "";
    lines.push("");
    lines.push(`  ${sevTag} ${kleur.bold(ruleId)}${lineSuffix}`);

    // Each occurrence's message; dedupe identical messages so a rule
    // firing N times with the same prose collapses to one bullet.
    const seenMsgs = new Set<string>();
    for (const issue of issues) {
      if (seenMsgs.has(issue.message)) continue;
      seenMsgs.add(issue.message);
      const extraLine =
        issue !== first && issue.line !== undefined
          ? kleur.dim(` (line ${issue.line})`)
          : "";
      lines.push(`    ${issue.message}${extraLine}`);
    }

    if (first.fix) {
      lines.push(`    ${kleur.dim("fix:")} ${first.fix}`);
    }
    if (first.docUrl) {
      lines.push(`    ${kleur.dim("docs:")} ${first.docUrl}`);
    }
  }

  return lines;
}

function isCritical(issue: Issue): boolean {
  return issue.severity === "error";
}

function shouldUseVerbose(ctx: ReportContext): boolean {
  // Auto-verbose for single-agent runs (the natural "I'm inspecting
  // this one agent" shape). Multi-agent runs stay compact unless the
  // caller explicitly opts in via `ctx.verbose`.
  if (ctx.verbose === true) return true;
  if (ctx.verbose === false) return false;
  return ctx.results.length === 1;
}

function render(ctx: ReportContext): string {
  const lines: string[] = [];
  const verbose = shouldUseVerbose(ctx);

  if (verbose) {
    for (let i = 0; i < ctx.results.length; i++) {
      if (i > 0) lines.push("");
      lines.push(...formatVerboseAgent(ctx.results[i]!));
    }
  } else {
    for (const result of ctx.results) {
      lines.push(formatSummaryLine(result));
    }
  }

  const totalAgents = ctx.results.length;
  const totalIssues = ctx.results.reduce(
    (sum, r) => sum + r.staticIssues.length,
    0,
  );
  const criticalCount = ctx.results.reduce(
    (sum, r) => sum + r.staticIssues.filter(isCritical).length,
    0,
  );
  const agentsWithIssues = ctx.results.filter(
    (r) => r.staticIssues.length > 0,
  ).length;

  lines.push("");
  // Format the totals so the numbers are accurate AND readable. The
  // pre-0.2 message read "1 agents checked, 1 issues, 2 critical" when
  // the run had 1 agent with 8 issues, 2 of them critical — confusing.
  // Now: "1 agent checked, 8 issues across 1 agent (2 critical)".
  const agentsWord = totalAgents === 1 ? "agent" : "agents";
  const issuesWord = totalIssues === 1 ? "issue" : "issues";
  const issuesAcrossWord = agentsWithIssues === 1 ? "agent" : "agents";
  const summary =
    totalIssues === 0
      ? `${totalAgents} ${agentsWord} checked, no issues`
      : `${totalAgents} ${agentsWord} checked, ${totalIssues} ${issuesWord} across ${agentsWithIssues} ${issuesAcrossWord} (${criticalCount} critical)`;
  lines.push(summary);

  // Hints at the bottom — only show when relevant.
  const hasFixable = ctx.results.some((r) =>
    r.staticIssues.some((i) => AUTOFIXABLE.has(i.ruleId)),
  );
  if (hasFixable) {
    lines.push("");
    lines.push(
      kleur.dim(
        "  Some issues are auto-fixable. Run `agelin fix <path>` to apply, or `agelin fix <path> --dry-run` to preview.",
      ),
    );
  }
  if (!verbose && agentsWithIssues > 0) {
    lines.push(
      kleur.dim(
        "  Run with --verbose to see the message and fix for each issue.",
      ),
    );
  }

  return lines.join("\n");
}

const consoleReporter: Reporter = {
  name: "console",
  render,
};

export default consoleReporter;
