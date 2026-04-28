import type { Rule, Issue } from "../types.js";

const MIN_TOKENS_TO_REQUIRE_EXAMPLES = 300;

const rule: Rule = {
  id: "no-examples",
  defaultSeverity: "suggestion",
  description:
    "Body is non-trivial (>300 tokens) but contains no code blocks or 'Example:' sections.",
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
          "no code blocks or 'Example:' sections found in a >300-token prompt. Few-shot examples improve consistency.",
        fix: "Add a worked example showing input -> expected output / tool sequence.",
      },
    ];
  },
};

export default rule;
