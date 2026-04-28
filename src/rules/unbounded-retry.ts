import type { Rule, Issue } from "../types.js";

const RETRY_PATTERNS = [
  /\bretry\b/i,
  /\btry again\b/i,
  /\bif (this|that|it) fails?\b/i,
  /\balternative approach(es)?\b/i,
  /\banother approach\b/i,
  /\bdifferent approach\b/i,
  /\bkeep trying\b/i,
  /\buntil (it )?(works|succeeds|passes)\b/i,
];

const BOUND_PATTERNS = [
  /\bat most \d+\b/i,
  /\bup to \d+\b/i,
  /\bafter \d+ (attempts?|tries|retries)\b/i,
  /\bmax(imum)? (of )?\d+\b/i,
  /\b\d+ attempts?\b/i,
  /\bgive up after\b/i,
  /\bstop after\b/i,
  /\bdo not retry\b/i,
  /\bnever retry\b/i,
  /\bone attempt\b/i,
  /\bsingle attempt\b/i,
];

const rule: Rule = {
  id: "unbounded-retry",
  defaultSeverity: "warning",
  description:
    "Agent encourages retrying on failure without a numeric cap or distinct-strategy directive.",
  check(subagent) {
    const issues: Issue[] = [];
    const body = subagent.body;

    const retryMatch = RETRY_PATTERNS.find((p) => p.test(body));
    if (!retryMatch) return issues;

    const hasBound = BOUND_PATTERNS.some((p) => p.test(body));
    if (hasBound) return issues;

    const m = body.match(retryMatch);
    const phrase = m?.[0] ?? "retry";

    issues.push({
      ruleId: rule.id,
      severity: rule.defaultSeverity,
      message: `body encourages retry behavior ("${phrase}") with no attempt cap — risks repeating the same failing approach.`,
      fix: 'Cap the loop, e.g. "Try at most 3 distinct approaches; if all fail, return a diagnostic summary and stop."',
    });
    return issues;
  },
};

export default rule;
