import type { Rule, Issue } from "../types.js";

const MAX_TOKENS = 2000;

const rule: Rule = {
  id: "prompt-too-long",
  defaultSeverity: "warning",
  description:
    "Body exceeds 2000 estimated tokens — long system prompts dilute attention and inflate per-call cost.",
  check(subagent) {
    if (subagent.bodyTokens <= MAX_TOKENS) return [];
    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `body is ~${subagent.bodyTokens} tokens (limit ${MAX_TOKENS}). Consider splitting into a focused agent + reference docs.`,
        fix: "Move examples and reference material out of the prompt; keep only the rules and the workflow.",
      },
    ];
  },
};

export default rule;
