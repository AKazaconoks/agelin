/**
 * `agelin check` — static-only run. Fast, free, deterministic.
 *
 * Pipeline: load config -> parse subagents (Agent A) -> apply rules
 * (Agent A) -> compute static-only scores -> render via reporter -> persist.
 *
 * For static-only runs we set successRate / costEfficiency / consistency
 * to 0 and weight staticHealth = 1.0, so the surfaced `score` reflects
 * static cleanliness alone.
 */

import { loadConfigWithPlugins } from "../config.js";
import { runRulesOnAgent } from "../lint-runner.js";
import { saveLastRun } from "../persistence.js";
import { getReporter } from "../reporters/index.js";
import { parseSubagentDir } from "../parser/parse.js";
import type {
  AgentScore,
  Issue,
  ParsedSubagent,
  ReportContext,
  Severity,
} from "../types.js";

export interface CheckOptions {
  path: string;
  format: string;
  configPath?: string;
  /**
   * Severity floor that triggers a non-zero exit code. Default: "error".
   * "none" disables the failure exit entirely (always exit 0).
   */
  failOn?: "error" | "warning" | "suggestion" | "none";
  /**
   * When true, omit agents with zero issues from console-format output.
   * JSON / markdown formats are unaffected.
   */
  quiet?: boolean;
}

const TOOL_VERSION = "0.0.1";

const SEVERITY_RANK: Record<Severity, number> = {
  error: 3,
  warning: 2,
  suggestion: 1,
};

const SEVERITY_WEIGHT: Record<Severity, number> = {
  error: 25,
  warning: 8,
  suggestion: 2,
};

function staticHealthFromIssues(issues: Issue[]): number {
  // start at 100, subtract weighted penalties, clamp to [0, 100]
  let score = 100;
  for (const issue of issues) {
    score -= SEVERITY_WEIGHT[issue.severity] ?? 0;
  }
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function buildScore(subagent: ParsedSubagent, issues: Issue[]): AgentScore {
  const staticHealth = staticHealthFromIssues(issues);
  // static-only: weight staticHealth 1.0, others 0 -> overall == staticHealth
  return {
    agentName: subagent.frontmatter.name || "(unnamed)",
    agentPath: subagent.path,
    score: staticHealth,
    components: {
      staticHealth,
      successRate: 0,
      costEfficiency: 0,
      consistency: 0,
    },
    staticIssues: issues,
  };
}

export async function runCheck(opts: CheckOptions): Promise<void> {
  const { config, rules } = await loadConfigWithPlugins(opts.configPath);
  const reporter = getReporter(opts.format);

  const subagents = await parseSubagentDir(opts.path);

  const allResults: AgentScore[] = subagents.map((subagent) => {
    const issues = runRulesOnAgent(subagent, rules, config);
    return buildScore(subagent, issues);
  });

  // Quiet mode: hide clean agents from rendered output (but keep them in
  // persisted ReportContext so `agelin report` can still show
  // everything). Only applies to console rendering — JSON/markdown stay
  // canonical so machine consumers see the full set.
  const renderResults =
    opts.quiet && (opts.format === "console" || !opts.format)
      ? allResults.filter((r) => r.staticIssues.length > 0)
      : allResults;

  const ctx: ReportContext = {
    results: renderResults,
    generatedAt: new Date().toISOString(),
    toolVersion: TOOL_VERSION,
  };

  const output = reporter.render(ctx);
  console.log(output);

  // persist for `agelin report` — full results, not the filtered set
  try {
    saveLastRun({ ...ctx, results: allResults });
  } catch (err) {
    // non-fatal — don't break the run if persistence fails
    console.error(
      `Warning: failed to save last run: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  // Exit policy. Default: fail on error-severity issues. --fail-on=none
  // never fails. --fail-on=warning fails on warning OR error. Etc.
  const failOn = opts.failOn ?? "error";
  if (failOn !== "none") {
    const threshold = SEVERITY_RANK[failOn];
    const triggered = allResults.some((r) =>
      r.staticIssues.some((i) => SEVERITY_RANK[i.severity] >= threshold),
    );
    if (triggered) {
      process.exit(1);
    }
  }
}
