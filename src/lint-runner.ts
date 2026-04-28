/**
 * Shared rule runner. The CLI commands `check`, `bench`, and `baseline`
 * all need the same "run every rule against an agent, apply severity
 * overrides, swallow rule-level exceptions" logic. Until this module
 * landed, three identical copies lived in the three CLI files. Consolidated
 * so suppression filtering (HTML-comment directives in the body) only
 * has to be added in one place.
 */

import type {
  Issue,
  ParsedSubagent,
  Rule,
  Severity,
  SubagentLintConfig,
} from "./types.js";
import { collectSuppressions, isSuppressed } from "./suppressions.js";

/**
 * Resolve the effective severity for a rule under the given config. The
 * special override `"off"` means "skip the rule entirely".
 */
export function effectiveSeverity(
  rule: Rule,
  config: SubagentLintConfig,
): Severity | "off" {
  const override = config.rules?.[rule.id];
  if (override === undefined) return rule.defaultSeverity;
  return override;
}

function applySeverityOverride(issue: Issue, override: Severity): Issue {
  if (issue.severity === override) return issue;
  return { ...issue, severity: override };
}

/**
 * Run every rule against a single subagent, apply severity overrides,
 * and filter out anything suppressed by inline directives. Errors thrown
 * inside a rule's `check` are surfaced as a warning-severity issue
 * tagged with that rule's id, so a single buggy rule never crashes the
 * whole run.
 */
export function runRulesOnAgent(
  subagent: ParsedSubagent,
  rules: Rule[],
  config: SubagentLintConfig,
): Issue[] {
  const suppressions = collectSuppressions(subagent.body ?? "");
  const issues: Issue[] = [];
  for (const rule of rules) {
    const sev = effectiveSeverity(rule, config);
    if (sev === "off") continue;
    let ruleIssues: Issue[] = [];
    try {
      ruleIssues = rule.check(subagent);
    } catch (err) {
      ruleIssues = [
        {
          ruleId: rule.id,
          severity: "warning",
          message: `Rule ${rule.id} threw: ${err instanceof Error ? err.message : String(err)}`,
        },
      ];
    }
    for (const issue of ruleIssues) {
      if (isSuppressed(issue, suppressions)) continue;
      issues.push(applySeverityOverride(issue, sev));
    }
  }
  // Surface parser errors as `parse-error` issues so reporters and
  // scoring see them. These predate the rule registry — they cover
  // shapes (malformed YAML, missing `name`) that the parser caught
  // before any rule got a chance to run.
  for (const parseError of subagent.parseErrors) {
    issues.push({
      ruleId: "parse-error",
      severity: "error",
      message: parseError,
    });
  }
  return issues;
}
