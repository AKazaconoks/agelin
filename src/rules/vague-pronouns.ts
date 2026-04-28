import type { Rule, Issue } from "../types.js";

const VAGUE_PHRASES = [
  "the appropriate tool",
  "the correct approach",
  "as needed",
  "where applicable",
];

const rule: Rule = {
  id: "vague-pronouns",
  defaultSeverity: "suggestion",
  description:
    "Body uses hand-wavy phrases ('the appropriate tool', 'as needed') without specifying what.",
  check(subagent) {
    const issues: Issue[] = [];
    const lower = subagent.body.toLowerCase();
    for (const phrase of VAGUE_PHRASES) {
      const idx = lower.indexOf(phrase);
      if (idx === -1) continue;
      // Treat as vague if there's no colon, "such as", "e.g.", or "specifically"
      // within the next ~120 chars suggesting it gets specified.
      const window = lower.slice(idx, idx + phrase.length + 120);
      const specifies =
        window.includes(":") ||
        window.includes("such as") ||
        window.includes("e.g.") ||
        window.includes("specifically") ||
        window.includes("for example");
      if (!specifies) {
        issues.push({
          ruleId: rule.id,
          severity: rule.defaultSeverity,
          message: `vague phrase "${phrase}" without subsequent specification`,
          fix: `Replace "${phrase}" with the concrete tool name, condition, or list.`,
        });
      }
    }
    return issues;
  },
};

export default rule;
