import type { Rule, Issue } from "../types.js";

/**
 * Discriminator rule: frontmatter `description` is bloated with `<example>...</example>`
 * tags or "e.g." / "example:" lead-ins instead of a single summary trigger sentence.
 *
 * Claude Code routes on the description; concrete trigger phrasing
 * ("Use when the user asks for X") routes more reliably than a wall of
 * embedded examples. We only flag long descriptions (>300 chars) where the
 * majority of the text is example content rather than a summary.
 *
 * Scope is the frontmatter `description` ONLY — body content is unaffected.
 * No overlap with `description-uses-cliche` (that rule scans hype phrases,
 * regardless of length).
 */

const EXAMPLE_TAG = /<example\b[^>]*>[\s\S]*?<\/example>/gi;
const EXAMPLE_LEAD = /^(?:e\.g\.|example\s*:|for\s+example,)/i;

const rule: Rule = {
  id: "description-uses-examples-instead-of-summary",
  defaultSeverity: "suggestion",
  description:
    "Frontmatter description is long and consists mostly of <example> tags or example lead-ins instead of a one-line trigger summary.",
  check(subagent) {
    const desc = subagent.frontmatter.description ?? "";
    if (!desc || desc.length <= 300) return [];

    const issues: Issue[] = [];

    // Condition A: dominant <example>...</example> coverage.
    let exampleChars = 0;
    for (const m of desc.matchAll(EXAMPLE_TAG)) {
      exampleChars += m[0].length;
    }
    const examplePct = (exampleChars / desc.length) * 100;
    if (examplePct > 50) {
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `description is ${desc.length} chars and ${examplePct.toFixed(0)}% of it is inside <example> tags. Routing benefits from a one-line trigger summary, not embedded examples.`,
        fix: "Replace the examples in the description with one summary sentence: 'Use when the user asks for X.'",
      });
      return issues;
    }

    // Condition B: starts with "e.g." or "example:" — example-led, not summary-led.
    if (EXAMPLE_LEAD.test(desc.trimStart())) {
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `description is ${desc.length} chars and starts with an example lead-in ("e.g." or "example:") instead of a trigger summary.`,
        fix: "Replace the examples in the description with one summary sentence: 'Use when the user asks for X.'",
      });
      return issues;
    }

    return issues;
  },
};

export default rule;
