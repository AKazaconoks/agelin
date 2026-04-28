import type { Rule, Issue } from "../types.js";

/**
 * An agent that does not state what it expects to receive forces every caller
 * to guess. A well-written agent either has a dedicated `## Inputs` (or
 * `## Preconditions`) section, or includes a sentence like "You will be given
 * a stack trace and the relevant source file."
 *
 * TODO(integration): when Unit 1 lands, replace the inline heading parser
 * with `subagent.ast.sections` / `subagent.ast.prose`.
 */

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
    "Body never states what inputs/state the agent expects. Callers cannot tell what to pass in.",
  check(subagent) {
    const body = subagent.body;
    if (!body.trim()) return [];

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
