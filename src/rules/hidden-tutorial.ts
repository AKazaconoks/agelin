import type { Rule, Issue } from "../types.js";

/**
 * Tutorial-scaffolding phrases ("Step 1: First, we'll explain...", "Let me
 * explain", "In this guide", "we will learn") indicate the prompt is teaching
 * the user rather than instructing the agent. Agent prompts should be
 * imperative — they tell the agent what to do, not narrate a lesson.
 *
 * Detection is whole-word, case-insensitive, on the body. Severity is
 * `suggestion` because some tutorial phrasing leaks in by accident and the
 * fix is straightforward (rephrase to imperative).
 */

const TUTORIAL_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bstep\s*1\s*:\s*first,\s*we['\u2019]?ll\b/i, label: "Step 1: First, we'll" },
  { re: /\blet\s+me\s+explain\b/i, label: "Let me explain" },
  { re: /\bin\s+this\s+(?:guide|tutorial|lesson|article|post)\b/i, label: "In this guide" },
  { re: /\bwe\s+will\s+learn\b/i, label: "we will learn" },
  { re: /\byou\s+(?:will|['\u2019]ll)\s+learn\b/i, label: "you will learn" },
  { re: /\bin\s+this\s+section,?\s+(?:we|you)['\u2019]?ll\b/i, label: "in this section, we'll" },
  { re: /\bfirst\s+you\s+should\s+learn\b/i, label: "first you should learn" },
  { re: /\blet['\u2019]?s\s+understand\b/i, label: "let's understand" },
];

// "Welcome to" only fires if it appears at the very start of the body or
// the start of a section heading line — generic "welcome to" prose
// elsewhere is too noisy.
const WELCOME_AT_START = /(?:^|\n#{1,6}[^\n]*\n+|\n\n)\s*welcome\s+to\b/i;

const rule: Rule = {
  id: "hidden-tutorial",
  defaultSeverity: "suggestion",
  description:
    "Body contains tutorial-scaffolding phrasing ('Let me explain', 'In this guide', 'we will learn') — the prompt is teaching the user instead of instructing the agent.",
  check(subagent) {
    const body = subagent.body;
    if (!body) return [];

    const issues: Issue[] = [];

    for (const { re, label } of TUTORIAL_PATTERNS) {
      const m = body.match(re);
      if (!m) continue;

      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `tutorial-scaffolding phrase detected: "${m[0]}" (${label}). Agent prompts should instruct, not teach.`,
        fix: "Agent prompts should instruct the agent, not teach the user. Replace 'Let me explain X' with 'When asked about X, return Y.'",
      });
    }

    const welcome = body.match(WELCOME_AT_START);
    if (welcome) {
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `tutorial-scaffolding phrase detected: "${welcome[0].trim()}" (welcome to). Agent prompts should instruct, not greet.`,
        fix: "Agent prompts should instruct the agent, not teach the user. Replace 'Welcome to X' with imperative instructions.",
      });
    }

    return issues;
  },
};

export default rule;
