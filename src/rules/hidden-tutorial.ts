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
  { re: /\bin\s+this\s+(?:guide|tutorial|lesson|article)\b/i, label: "In this guide" },
  { re: /\bwe\s+will\s+learn\b/i, label: "we will learn" },
  { re: /\bfirst\s+you\s+should\s+learn\b/i, label: "first you should learn" },
  { re: /\blet['\u2019]?s\s+understand\b/i, label: "let's understand" },
];

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

    return issues;
  },
};

export default rule;
