import type { Rule, Issue } from "../types.js";

/**
 * `no-examples` flags a non-trivial agent body that contains no worked
 * example. The token floor was raised from 300 → 1200 in 0.5.0 after the
 * phase-2 case study showed that mandating examples on already-concise
 * agents inflates response length without improving quality (see the
 * `node-specialist` regression: lint+fix grew its body from 4.3 KB →
 * 7.4 KB, slowed mean response by 12%, and dropped 11/15 → 8/15 strict
 * pass).
 *
 * The rule still fires on genuinely-bloated agents (>1200 tokens of
 * prose with no example) — those benefit from a worked example. Terse
 * agents that already do one thing are exempt; their conciseness is the
 * win.
 */
const MIN_TOKENS_TO_REQUIRE_EXAMPLES = 1200;

const rule: Rule = {
  id: "no-examples",
  defaultSeverity: "suggestion",
  description:
    "Body is non-trivial (>1200 tokens) but contains no code blocks or 'Example:' sections.",
  check(subagent) {
    if (subagent.bodyTokens <= MIN_TOKENS_TO_REQUIRE_EXAMPLES) return [];
    const body = subagent.body;
    const hasFence = body.includes("```");
    const hasExampleHeader = /(^|\n)\s*(?:#+\s*)?Example[s:]?\b/i.test(body);
    if (hasFence || hasExampleHeader) return [];
    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message:
          "no code blocks or 'Example:' sections found in a >1200-token prompt. Few-shot examples improve consistency.",
        fix: "Add a worked example showing input -> expected output / tool sequence.",
      },
    ];
  },
};

export default rule;
