import type { Rule, Issue } from "../types.js";

/**
 * Discriminator rule: agents whose `description` field ships boilerplate
 * hype phrases ("expert in", "comprehensive", "10x", "world-class") instead
 * of stating a trigger condition. Claude Code routes on what an agent does,
 * not on adjectives — clichéd descriptions waste the field.
 *
 * Scope is the frontmatter `description` ONLY (not the body). Body openers
 * are covered by `role-play-bloat`. Different surface, no overlap.
 */

const CLICHE_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b10x\b/i, label: "10x" },
  { re: /\bworld[- ]class\b/i, label: "world-class" },
  { re: /\bbest[- ]in[- ]class\b/i, label: "best-in-class" },
  { re: /\bprofessional[- ]grade\b/i, label: "professional-grade" },
  { re: /\b(senior|principal|staff)\s+(engineer|developer|specialist)\b/i, label: "seniority puffery" },
  { re: /\bexpert(?:ise)?\s+(in|at|with)\b/i, label: "expert in" },
  { re: /\bspecial(?:ist|ising|izing)\s+in\b/i, label: "specialist in" },
  { re: /\bcomprehensive\b/i, label: "comprehensive" },
  { re: /\bcutting[- ]edge\b/i, label: "cutting-edge" },
  { re: /\bdeep\s+(expertise|knowledge|understanding)\b/i, label: "deep expertise" },
];

const rule: Rule = {
  id: "description-uses-cliche",
  defaultSeverity: "warning",
  description:
    "Frontmatter description leans on hype clichés ('10x', 'world-class', 'expert in', 'comprehensive') instead of stating the trigger condition.",
  check(subagent) {
    const desc = subagent.frontmatter.description ?? "";
    if (!desc) return [];
    const issues: Issue[] = [];
    for (const { re, label } of CLICHE_PATTERNS) {
      const m = desc.match(re);
      if (m) {
        issues.push({
          ruleId: rule.id,
          severity: rule.defaultSeverity,
          message: `description contains hype phrase "${m[0]}" (${label}). Claude Code routes on what the agent does, not on adjectives.`,
          fix: 'Replace adjectives with a trigger sentence: "Use when the user asks for X" or "Use after Y happens".',
        });
        return issues;
      }
    }
    return issues;
  },
};

export default rule;
