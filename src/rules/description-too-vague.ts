import type { Rule, Issue } from "../types.js";

const VAGUE_EXACT = new Set([
  "helper agent",
  "general purpose",
  "does stuff",
  "ai agent",
]);
const MIN_LENGTH = 30;

const rule: Rule = {
  id: "description-too-vague",
  defaultSeverity: "warning",
  description:
    "Frontmatter `description` is generic ('helper agent', 'general purpose') or under 30 chars — Claude Code will not know when to invoke it.",
  check(subagent) {
    const descRaw = subagent.frontmatter.description?.trim() ?? "";
    if (!descRaw) return []; // covered by frontmatter-description-missing
    const desc = descRaw.toLowerCase();
    if (VAGUE_EXACT.has(desc)) {
      return [
        {
          ruleId: rule.id,
          severity: rule.defaultSeverity,
          message: `description is a known generic placeholder ("${descRaw}").`,
          fix: "Describe the job AND the trigger condition: 'Audits dependency manifests for known CVEs; use before each release.'",
        },
      ];
    }
    if (descRaw.length < MIN_LENGTH) {
      return [
        {
          ruleId: rule.id,
          severity: rule.defaultSeverity,
          message: `description is only ${descRaw.length} chars (min ${MIN_LENGTH}) — likely too vague to route on.`,
          fix: "Add the trigger condition: when should Claude Code pick this agent over the others?",
        },
      ];
    }
    return [];
  },
};

export default rule;
