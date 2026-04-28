import type { Rule, Issue } from "../types.js";

/**
 * Persona / hype prefixes ("You are a 10x rockstar engineer with 30
 * years of experience") at the top of an agent prompt have not been
 * shown to reliably improve task accuracy on modern frontier models,
 * and they always cost some attention budget. This rule flags the
 * common offenders so prompt authors get nudged toward concrete task
 * descriptions ("When invoked, do X; output Y").
 *
 * Earlier versions cited a single 2023 arxiv paper as the docUrl. We
 * dropped it in 0.2.2 because:
 *   - Anthropic's prompting guide is a more durable, maintained reference
 *     for "what to put in a system prompt"; we'll point at it from a
 *     dedicated agelin docs page in a later release.
 *   - The original paper studied MMLU, not agentic workflows; quoting
 *     it as the authority overstates the empirical case.
 *   - Folklore on this is now broad enough that a citation isn't needed
 *     to make the rule defensible.
 *
 * Severity stays `suggestion`. The phrase "world-class" doesn't break
 * anything; it just spends tokens on flavour.
 */

const PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\byou are a 10x\b/i, label: "10x" },
  { re: /\bworld[- ]class\b/i, label: "world-class" },
  { re: /\bbest[- ]in[- ]class\b/i, label: "best-in-class" },
  { re: /\bexpert with \d+\+? years?\b/i, label: "X years of experience" },
  { re: /\brockstar\b/i, label: "rockstar" },
  { re: /\bgenius\b/i, label: "genius" },
  { re: /\bninja\b/i, label: "ninja" },
];

const rule: Rule = {
  id: "role-play-bloat",
  defaultSeverity: "suggestion",
  description:
    "Body opens with a hype/persona phrase ('10x', 'world-class', 'rockstar'). These don't reliably improve accuracy and consume attention budget — open with what the agent does instead.",
  check(subagent) {
    // Scan the first ~400 chars of the body — that's where persona
    // prefixes live ("You are a world-class …"). Hype phrases later
    // in the body are usually quoting user input or describing prior
    // art; flagging those would produce too many false positives.
    const opener = (subagent.body ?? "").slice(0, 400);
    for (const { re, label } of PATTERNS) {
      const match = opener.match(re);
      if (match) {
        return [
          {
            ruleId: rule.id,
            severity: rule.defaultSeverity,
            message:
              `opens with hype phrase "${match[0]}" (${label}). Frontier models ` +
              `do not reliably benefit from persona prefixes; the agent's actual capability comes from its tools, instructions, and examples.`,
            fix:
              'Replace the persona line with a concrete task description: "When invoked, do X. Return Y." ' +
              "Anything the model needs to know about the domain belongs in the workflow steps, not in a self-introduction.",
          },
        ];
      }
    }
    return [];
  },
};

export default rule;
