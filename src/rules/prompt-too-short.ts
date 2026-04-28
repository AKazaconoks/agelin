import type { Rule, Issue } from "../types.js";

const MIN_TOKENS = 50;

const rule: Rule = {
  id: "prompt-too-short",
  defaultSeverity: "warning",
  description:
    "Body is under 50 estimated tokens — likely missing scope, constraints, or exit criteria.",
  check(subagent) {
    if (subagent.bodyTokens >= MIN_TOKENS) return [];
    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `body is only ~${subagent.bodyTokens} tokens — almost certainly underspecified.`,
        fix: "Add: (1) the agent's job, (2) the inputs it can expect, (3) constraints, (4) how it knows it's done.",
      },
    ];
  },
};

export default rule;
