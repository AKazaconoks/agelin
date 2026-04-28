import type { Rule, Issue } from "../types.js";

/**
 * Two ways an agent communicates a stopping point:
 *
 *  1. Explicit termination phrases ("stop when X", "exit when Y") — direct.
 *  2. Implicit terminal-deliverable structure ("Output: ...", "Return a JSON
 *     report containing ...", "Provide your analysis", numbered steps ending
 *     in a final return verb) — an agent that knows what to deliver also
 *     knows when it is done.
 *
 * We accept either form. Only when the body contains neither do we flag it
 * — a structurally rare case in well-written agents.
 */

const EXPLICIT_EXIT_PHRASES = [
  /\bwhen\s+done\b/i,
  /\bexit\s+when\b/i,
  /\bstop\s+when\b/i,
  /\bcomplete\s+when\b/i,
  /\breturn\s+when\b/i,
  /\bfinish\s+when\b/i,
  /\bonce\s+you\s+have\b/i,
  /\bonce\s+(the|all|every)\s+\w+\s+(is|are|have|has)\b/i,
  /\bafter\s+(producing|generating|writing|completing|finalizing|verifying)\b/i,
  /\b(conclude|end|finish)\s+(with|by)\b/i,
  /\bterminate\b/i,
];

const TERMINAL_DELIVERABLE_PATTERNS = [
  // Verb + any noun: "Provide endpoints", "Return JSON", "Output the report"
  /\b(return|provide|output|deliver|emit|produce|report|share|hand\s+off)\s+\w+/i,
  // "final / your <deliverable noun>"
  /\b(final|your)\s+(output|response|answer|deliverable|result|report|analysis|verdict|recommendation|reply|summary)\b/i,
  // Section header lines (markdown): "## Output", "### Final Result", "Output:"
  /^\s*#{1,4}\s*(output|return|response|deliverable|final|format|result|deliverables?)\b/im,
  /^\s*(output|return|deliverable|final\s+output|response\s+format|expected\s+output)\s*:/im,
  // "Your output should be ...", "answer must contain ..."
  /\byour\s+(answer|response|output|reply|deliverable|result|summary)\s+(should|must|will|is|contains|includes)/i,
  // Procedural workflow markers — numbered/ordered task list implies contract
  /^\s*\d+\.\s+\w+/m,
  // "When invoked:" / "Workflow:" style — a procedural contract follows
  /^\s*(when\s+invoked|workflow|process|steps|procedure|approach)\s*:/im,
  // "summarize the / your / in" + general "summarize ..."
  /\bsummari[sz]e\b/i,
  // "respond with X" / "reply with X" / "answer with X"
  /\b(respond|reply|answer)\s+(with|using|in)\b/i,
];

const rule: Rule = {
  id: "no-exit-criteria",
  defaultSeverity: "warning",
  description:
    "Body lacks both explicit termination phrasing and an implicit terminal-deliverable contract. Agents in this state tend to keep working past the natural stopping point.",
  check(subagent) {
    const issues: Issue[] = [];
    const body = subagent.body;

    const hasExplicit = EXPLICIT_EXIT_PHRASES.some((p) => p.test(body));
    if (hasExplicit) return issues;

    const hasTerminalDeliverable = TERMINAL_DELIVERABLE_PATTERNS.some((p) => p.test(body));
    if (hasTerminalDeliverable) return issues;

    issues.push({
      ruleId: rule.id,
      severity: rule.defaultSeverity,
      message:
        "no stopping signal detected — neither an explicit termination phrase nor a terminal-deliverable contract was found.",
      fix: 'Add either an explicit phrase ("Stop when the tests pass") OR a deliverable contract ("Return a JSON object with the fields ..."). Either will do — well-written agents usually have the latter.',
    });
    return issues;
  },
};

export default rule;
