import type { Rule, Issue } from "../types.js";

/**
 * Role-play prefixes ("You are a 10x rockstar engineer with 30 years of
 * experience") have not been shown to improve task accuracy in modern LLMs.
 * See "When 'A Helpful Assistant' Is Not Really Helpful" (Zheng et al., 2024)
 * — system role personas had inconsistent and often negative effects on MMLU.
 */
const PATTERNS: RegExp[] = [
  /you are a 10x\b/i,
  /\bworld[- ]class\b/i,
  /\bexpert with \d+\+? years?\b/i,
  /\brockstar\b/i,
  /\bgenius\b/i,
  /\bninja\b/i,
];

const rule: Rule = {
  id: "role-play-bloat",
  defaultSeverity: "suggestion",
  description:
    "Body opens with role-play hype ('10x', 'world-class', 'rockstar', 'genius'). Research shows persona prefixes don't improve accuracy.",
  check(subagent) {
    const issues: Issue[] = [];
    // Look at the first ~400 chars of the body; that's where persona prefixes live.
    const opener = subagent.body.slice(0, 400);
    for (const pattern of PATTERNS) {
      const match = opener.match(pattern);
      if (match) {
        issues.push({
          ruleId: rule.id,
          severity: rule.defaultSeverity,
          message: `role-play hype phrase detected: "${match[0]}". This wastes tokens and does not improve task accuracy.`,
          fix: "Open with a concrete job description (what the agent does, in what context) instead of a persona.",
          docUrl:
            "https://arxiv.org/abs/2311.10054", // "When 'A Helpful Assistant' Is Not Really Helpful"
        });
        break; // one hit is enough — don't pile on.
      }
    }
    return issues;
  },
};

export default rule;
