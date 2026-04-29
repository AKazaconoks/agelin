import type { Rule, Issue } from "../types.js";

/**
 * An agent that does not state what it expects to receive forces every caller
 * to guess. A well-written agent either has a dedicated `## Inputs` (or
 * `## Preconditions`) section, or includes a sentence like "You will be given
 * a stack trace and the relevant source file."
 *
 * **0.5.0 change:** added a 1200-token floor. Phase-2 case study found that
 * mandating an `## Inputs` section on already-concise agents
 * (`node-specialist` was 1100 tokens before lint+fix) inflated body length
 * without improving consistency. Below the floor, the agent's description
 * field already adequately states inputs; the body section is overhead.
 * Above 1200 tokens, the rule still fires.
 *
 * TODO(integration): when Unit 1 lands, replace the inline heading parser
 * with `subagent.ast.sections` / `subagent.ast.prose`.
 */

const MIN_TOKENS_TO_REQUIRE_INPUT_SECTION = 1200;

const HEADING_RE = /^(#{1,4})\s+(.+?)\s*$/gm;
const INPUT_HEADING_RE =
  /^(inputs?|preconditions?|expects?|given|state|environment)$/i;

const INPUT_PHRASES: RegExp[] = [
  /\byou\s+will\s+be\s+given\b/i,
  /\byou\s+receive\b/i,
  /\bthe\s+user\s+provides\b/i,
  /\binput\s+is\b/i,
  /\bexpects?\s*:/i,
  /\bassumes?\s*:/i,
  /\bpreconditions?\s*:/i,
  /\bcontext\s*:\s/i,
];

function hasInputHeading(body: string): boolean {
  HEADING_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HEADING_RE.exec(body)) !== null) {
    const text = match[2].trim().replace(/[*_`:]+/g, "").trim();
    if (INPUT_HEADING_RE.test(text)) return true;
  }
  return false;
}

const rule: Rule = {
  id: "missing-input-preconditions",
  defaultSeverity: "suggestion",
  description:
    "Body never states what inputs/state the agent expects. Skipped when body is concise (<1200 tokens). Otherwise callers cannot tell what to pass in.",
  check(subagent) {
    const body = subagent.body;
    if (!body.trim()) return [];
    if (subagent.bodyTokens <= MIN_TOKENS_TO_REQUIRE_INPUT_SECTION) return [];

    if (hasInputHeading(body)) return [];
    if (INPUT_PHRASES.some((p) => p.test(body))) return [];

    const issues: Issue[] = [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message:
          "agent body never states what inputs/state it expects. Callers can't tell what to pass in.",
        fix: 'Add an `## Inputs` section or a sentence like "You will be given a stack trace and the relevant source file."',
      },
    ];
    return issues;
  },
};

export default rule;
