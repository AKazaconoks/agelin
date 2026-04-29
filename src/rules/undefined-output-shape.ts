import type { Rule, Issue } from "../types.js";

/**
 * Distinct from `no-exit-criteria` (which checks WHEN the agent should stop),
 * this rule checks WHAT shape the deliverable should take. An agent that says
 * "stop when you have answered the question" still leaves the model guessing
 * whether to return JSON, markdown, or a free-form paragraph — and different
 * runs will pick differently.
 *
 * We accept either a dedicated section (## Output Format, ## Return,
 * ## Deliverable, ...) or a body paragraph that names a concrete shape
 * ("Return a JSON object ...", "Provide a markdown report ...").
 *
 * **0.5.0 change:** added a 1200-token floor. Phase-2 case study found that
 * mandating an explicit Output-Format section on already-concise agents
 * (`node-specialist` was 1100 tokens before lint+fix) inflated response
 * length without improving quality. Below the floor, the agent's brevity
 * IS its output shape; the rule is silent. Above 1200 tokens, the rule
 * still fires — bloated agents benefit from explicit shape guidance.
 *
 * TODO(integration): when Unit 1 lands, replace the inline heading parser
 * with `subagent.ast.sections` / `subagent.ast.prose`.
 */

const MIN_TOKENS_TO_REQUIRE_OUTPUT_SHAPE = 1200;

const HEADING_RE = /^(#{1,4})\s+(.+?)\s*$/gm;
const SHAPE_HEADING_RE =
  /^(output|return|deliverable|format|response\s+format|expected\s+output|result)s?$/i;

const SHAPE_PARAGRAPH_RE =
  /\b(return|provide|output|deliver)\s+(a|an|the|your)\s+(json|markdown|list|table|report|summary|object|array|string)\b/i;

function hasOutputHeading(body: string): boolean {
  HEADING_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HEADING_RE.exec(body)) !== null) {
    const text = match[2].trim().replace(/[*_`:]+/g, "").trim();
    if (SHAPE_HEADING_RE.test(text)) return true;
  }
  return false;
}

const rule: Rule = {
  id: "undefined-output-shape",
  defaultSeverity: "warning",
  description:
    "Body never specifies the shape of the deliverable (JSON / markdown / list / report). Skipped when body is concise (<1200 tokens). Different runs will otherwise guess differently and produce inconsistent output.",
  check(subagent) {
    const body = subagent.body;
    if (!body.trim()) return [];
    if (subagent.bodyTokens <= MIN_TOKENS_TO_REQUIRE_OUTPUT_SHAPE) return [];

    if (hasOutputHeading(body)) return [];
    if (SHAPE_PARAGRAPH_RE.test(body)) return [];

    const issues: Issue[] = [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message:
          "agent body never specifies the output shape. Models will guess at deliverable structure (json vs markdown vs prose), producing inconsistent results.",
        fix: 'Add an `## Output Format` section or a paragraph like "Return a JSON object with fields: ..." / "Return a markdown report containing ...".',
      },
    ];
    return issues;
  },
};

export default rule;
