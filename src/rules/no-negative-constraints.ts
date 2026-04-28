import type { Rule, Issue } from "../types.js";

/**
 * Constraints can be expressed two ways:
 *
 *  1. Negative form ("do not modify the database", "never call shell").
 *  2. Positive-restriction form ("only modify the file specified", "limit
 *     edits to the function in question", "restrict tool use to Read/Grep").
 *
 * Both are equally effective. Only flag when neither is present.
 */

const NEGATIVE_PATTERNS = [
  /\bdo\s+not\b/i,
  /\bdon'?t\b/i,
  /\bnever\b/i,
  /\bavoid\b/i,
  /\brefrain\s+from\b/i,
  /\bmust\s+not\b/i,
  /\bcannot\b/i,
  /\bcan'?t\b/i,
  /\bshould\s+not\b/i,
  /\bshouldn'?t\b/i,
];

const POSITIVE_RESTRICTION_PATTERNS = [
  /\b(only|exclusively)\s+(use|modify|edit|read|access|run|return|output|change|touch|focus|consider|operate|invoke|call|reference)/i,
  /\blimit(ed)?\s+to\b/i,
  /\bscoped?\s+to\b/i,
  /\brestrict(ed|ion)?\s+to\b/i,
  /\bconfine[d]?\s+to\b/i,
  /\b(must|should|will)\s+(remain|stay)\s+(read[- ]only|within|inside)\b/i,
  /\bin[- ]scope\b/i,
  /\bout[- ]of[- ]scope\b/i,
  /\bboundary|boundaries\b/i,
  /\b(only|just)\s+(when|if|where|after)\b/i,
  /\bmust\s+only\b/i,
];

const rule: Rule = {
  id: "no-negative-constraints",
  defaultSeverity: "warning",
  description:
    "Body has no constraints in either negative ('do not X') or positive-restriction ('only X', 'limit to Y') form. Models tend to over-explore without guardrails.",
  check(subagent) {
    const issues: Issue[] = [];
    const body = subagent.body;

    const hasNegative = NEGATIVE_PATTERNS.some((p) => p.test(body));
    if (hasNegative) return issues;

    const hasPositiveRestriction = POSITIVE_RESTRICTION_PATTERNS.some((p) => p.test(body));
    if (hasPositiveRestriction) return issues;

    issues.push({
      ruleId: rule.id,
      severity: rule.defaultSeverity,
      message:
        "no constraints detected — neither negative ('do not') nor positive-restriction ('only X', 'limit to Y') guardrails were found.",
      fix: 'Add a constraint in either form. Negative: "Do not modify files outside the working directory." Positive: "Only edit files matching the user\'s pattern." Either prevents drift.',
    });
    return issues;
  },
};

export default rule;
