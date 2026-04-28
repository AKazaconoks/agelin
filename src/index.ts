/**
 * agelin — public programmatic API.
 *
 * Library entry point. Imported by tools that want to embed the linter
 * (VS Code extensions, custom CI scripts, plugin authors). The CLI lives
 * at `./cli.js`; this file is the *library* face of the package.
 *
 * Stability contract:
 *   - Anything re-exported here is part of the documented public API and
 *     follows semver. Breaking changes bump the major.
 *   - Anything imported from `agelin/dist/...` directly is an internal
 *     detail and may change without warning. Import from `agelin` (this
 *     file) if you want the stability guarantee.
 *
 * Quick recipe:
 *
 *   import { lint } from "agelin";
 *
 *   const report = await lint("./.claude/agents/");
 *   for (const agent of report.results) {
 *     console.log(agent.agentName, agent.score, agent.staticIssues.length);
 *   }
 */

import { parseSubagentDir } from "./parser/parse.js";
import { ALL_RULES } from "./rules/index.js";
import { computeAgentScore } from "./scoring/index.js";
import type { AgentScore, Issue, ReportContext } from "./types.js";

// ---------- types ----------------------------------------------------------
export type {
  AgentScore,
  GoldenTask,
  Issue,
  ParsedSubagent,
  ReportContext,
  Reporter,
  Rule,
  RunResult,
  Severity,
  SubagentFrontmatter,
  SubagentLintConfig,
  SubagentTool,
  TaskAssertion,
  TaskCategory,
} from "./types.js";

export type { MarkdownAST } from "./parser/markdown.js";

// ---------- parser ---------------------------------------------------------
export {
  parseSubagent,
  parseSubagentDir,
  parseSubagentFromString,
} from "./parser/parse.js";
export { tokenizeMarkdown } from "./parser/markdown.js";

// ---------- rules ----------------------------------------------------------
export { ALL_RULES, getRule } from "./rules/index.js";

// ---------- scoring --------------------------------------------------------
export {
  computeAgentScore,
  computeStaticHealth,
  computeSuccessRate,
  computeCostEfficiency,
  computeConsistency,
} from "./scoring/index.js";

// ---------- reporters ------------------------------------------------------
export { getReporter } from "./reporters/index.js";

// ---------- high-level convenience ----------------------------------------

/**
 * Options for {@link lint}. All optional.
 *
 * - `rules` — override the rule set. Defaults to {@link ALL_RULES}. Pass a
 *   subset to run only specific checks, or extend with custom rules.
 * - `severityOverrides` — bump or silence individual rules without forking
 *   the rule set. Map of `ruleId -> "error" | "warning" | "suggestion" | "off"`.
 *   `"off"` skips the rule entirely.
 */
export interface LintOptions {
  rules?: typeof ALL_RULES;
  severityOverrides?: Record<string, "error" | "warning" | "suggestion" | "off">;
}

/**
 * Run static analysis against a path (file or directory) and return a
 * {@link ReportContext}. This is the same data structure the CLI's
 * `--format=json` produces.
 *
 * Static-only — does not call the Anthropic API or spawn `claude`. For
 * the dynamic benchmark see the `bench` CLI command (no programmatic
 * equivalent exported yet; treat that surface as unstable).
 *
 * @param path Absolute or relative path to a `.md` file or a directory.
 * @param opts {@link LintOptions}
 */
export async function lint(
  path: string,
  opts: LintOptions = {},
): Promise<ReportContext> {
  // `parseSubagentDir` is currently synchronous (uses node:fs sync calls).
  // The function is `async` to leave room for future fs.promises adoption
  // without a breaking change to callers.
  const subagents = parseSubagentDir(path);
  const rules = opts.rules ?? ALL_RULES;
  const overrides = opts.severityOverrides ?? {};

  const results: AgentScore[] = subagents.map((subagent) => {
    const issues: Issue[] = [];
    for (const rule of rules) {
      const override = overrides[rule.id];
      if (override === "off") continue;
      const ruleIssues = rule.check(subagent);
      for (const issue of ruleIssues) {
        // After the `=== "off"` guard above, override is narrowed to
        // a real Severity (or undefined). Just check truthiness.
        if (override) {
          issues.push({ ...issue, severity: override });
        } else {
          issues.push(issue);
        }
      }
    }
    return computeAgentScore(subagent, issues, []);
  });

  return {
    results,
    generatedAt: new Date().toISOString(),
    toolVersion: VERSION,
  };
}

/** Current package version. Bumped at release time. */
export const VERSION = "0.4.0";
