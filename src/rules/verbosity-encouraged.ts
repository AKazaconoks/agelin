import type { Rule, Issue } from "../types.js";

const BLOAT_PATTERNS = [
  /\bcomprehensive\b/i,
  /\bdetailed\s+(explanation|analysis|breakdown|description)\b/i,
  /\bthorough(ly)?\s+(explain|analyze|describe|document)\b/i,
  /\bstep[- ]by[- ]step\s+(explanation|breakdown|walkthrough)\b/i,
  /\bexhaustive\b/i,
  /\bin[- ]depth\s+(analysis|explanation|review)\b/i,
  /\belaborate\s+on\b/i,
  /\bverbose\b/i,
  /\bextensive(ly)?\s+(document|explain)\b/i,
];

const CONCISE_PATTERNS = [
  /\bbrief(ly)?\b/i,
  /\bconcise\b/i,
  /\bone[- ]?sentence\b/i,
  /\btl;?dr\b/i,
  /\bno preamble\b/i,
  /\bskip the (intro|preamble|preface)\b/i,
  /\bdo not (over[- ]?)?explain\b/i,
  /\bterse\b/i,
  /\bshort answer\b/i,
  /\bbullet points? only\b/i,
  /\bsummari[sz]e in\b/i,
  /\bunder \d+ (words?|sentences?|lines?)\b/i,
];

const rule: Rule = {
  id: "verbosity-encouraged",
  defaultSeverity: "suggestion",
  description:
    "Agent encourages verbose output (comprehensive, detailed, exhaustive) without a counterbalancing conciseness directive.",
  check(subagent) {
    const issues: Issue[] = [];
    const body = subagent.body;

    const bloatMatch = BLOAT_PATTERNS.find((p) => p.test(body));
    if (!bloatMatch) return issues;

    const hasConciseness = CONCISE_PATTERNS.some((p) => p.test(body));
    if (hasConciseness) return issues;

    const m = body.match(bloatMatch);
    const phrase = m?.[0] ?? "verbose output";

    issues.push({
      ruleId: rule.id,
      severity: rule.defaultSeverity,
      message: `prompt encourages verbose output ("${phrase}") with no length cap — agents will burn tokens on padding.`,
      fix: 'Add a length constraint, e.g. "Reply in under 5 sentences" or "No preamble; lead with the answer."',
    });
    return issues;
  },
};

export default rule;
