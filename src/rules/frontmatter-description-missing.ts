import type { Rule, Issue } from "../types.js";

const MIN_LENGTH = 20;

const rule: Rule = {
  id: "frontmatter-description-missing",
  defaultSeverity: "error",
  description:
    "Frontmatter `description` is empty or under 20 characters. Claude Code uses this string to route work to the right agent.",
  check(subagent) {
    const desc = subagent.frontmatter.description?.trim() ?? "";
    if (desc.length >= MIN_LENGTH) return [];
    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message:
          desc.length === 0
            ? "frontmatter `description` is missing or empty."
            : `frontmatter \`description\` is only ${desc.length} chars (min ${MIN_LENGTH}).`,
        fix: "Write a one-sentence description that names the job AND when to invoke it (e.g. 'Reviews TypeScript PRs for type-safety regressions; use after each diff').",
      },
    ];
  },
};

export default rule;
