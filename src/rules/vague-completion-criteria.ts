import type { Rule, Issue } from "../types.js";

/**
 * Mitigated overlap rule: complements `no-exit-criteria`.
 *
 * `no-exit-criteria` fires when there is NO stopping signal at all.
 * This rule fires when there IS an exit phrase but it terminates in a
 * vague adverb ("appropriately", "as needed") or vague clause
 * ("until satisfied", "when you're done") with no concrete predicate —
 * no comparison operator, no tool invocation, no specific outcome noun.
 *
 * Severity is `suggestion` — vague exit criteria still beat silent
 * non-termination, but a concrete predicate is materially better.
 */

const VAGUE_EXIT_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b(when|once)\s+you(?:'re|\s+are)\s+done\b/i, label: "when you're done" },
  { re: /\buntil\s+(?:you\s+are\s+)?satisfied\b/i, label: "until satisfied" },
  { re: /\bas\s+needed\b/i, label: "as needed" },
  { re: /\b(?:stop|exit|return|complete|finish)\s+(?:as\s+)?appropriate(?:ly)?\b/i, label: "stop appropriately" },
  { re: /\b(?:stop|exit|return|complete|finish)\s+when\s+(?:it|you)\s+(?:feels|seems|looks)\b/i, label: "stop when it feels right" },
];

// Concrete-predicate signals that, if present, indicate the exit IS specific
// enough — we should NOT fire even though a vague phrase appears.
const CONCRETE_PREDICATE_PATTERNS: RegExp[] = [
  // comparison operators
  /[<>]=?|==|!=/,
  // tool invocations (back-tick wrapped names) — agents commonly cite tools
  /`(?:Read|Write|Edit|Bash|Glob|Grep|WebFetch|WebSearch|Task|TodoWrite)`/,
  // explicit numeric thresholds ("at least 3", "all 5", "100%")
  /\b(?:at\s+least|exactly|all|every)\s+\d+\b/i,
  /\b\d+\s*%/,
  // explicit deliverable-noun completion ("tests pass", "JSON report produced")
  /\b(?:tests?\s+pass|build\s+succeeds|all\s+checks\s+pass|file\s+is\s+written|report\s+is\s+(?:produced|complete))\b/i,
  // produced/written specific-noun forms
  /\b(?:produced|written|emitted|returned)\s+the\s+\w+/i,
];

const rule: Rule = {
  id: "vague-completion-criteria",
  defaultSeverity: "suggestion",
  description:
    "Body has an explicit exit phrase but it terminates in a vague adverb or clause ('appropriately', 'as needed', 'until satisfied') with no concrete predicate.",
  check(subagent) {
    const body = subagent.body;
    if (!body) return [];

    const issues: Issue[] = [];

    for (const { re, label } of VAGUE_EXIT_PATTERNS) {
      const m = body.match(re);
      if (!m) continue;

      // Inspect a window around the match for a concrete predicate.
      const idx = m.index ?? 0;
      const windowStart = Math.max(0, idx - 120);
      const windowEnd = Math.min(body.length, idx + m[0].length + 200);
      const windowText = body.slice(windowStart, windowEnd);
      const hasConcrete = CONCRETE_PREDICATE_PATTERNS.some((p) => p.test(windowText));
      if (hasConcrete) continue;

      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `vague exit phrasing: "${m[0]}" (${label}). No concrete predicate (comparison, tool call, or specific outcome) found nearby.`,
        fix: "Make the completion criterion concrete: e.g., 'Stop when all tests pass' or 'Stop after producing the JSON report.'",
      });
    }

    return issues;
  },
};

export default rule;
