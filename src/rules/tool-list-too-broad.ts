import type { Rule, Issue } from "../types.js";
import { getToolList } from "../parser/tools.js";

/**
 * Discriminator rule: agents whose description suggests a single narrow
 * action (one verb: "review", "format", "summarize") but ship the full
 * tool palette. Differential signal because lazy authors copy a kitchen-
 * sink tools list regardless of the agent's actual job.
 *
 * Complements `tool-overreach` (which keys on read-only language + write
 * tools) and is keyed on narrow-verb scope + tool-list breadth. Different
 * population.
 */

const NARROW_VERBS = [
  "format",
  "lint",
  "review",
  "audit",
  "summarize",
  "summarise",
  "explain",
  "diagnose",
  "classify",
  "translate",
  "rename",
];

const BROAD_TOOL_THRESHOLD = 6;
/**
 * Local "all-known" set used as a kitchen-sink heuristic. Intentionally
 * narrower than the shared CANONICAL_TOOLS in `parser/tools.ts`: we want
 * to detect "this agent declared every common tool", and the rule was
 * tuned against this 10-tool population. Don't widen without a fixture
 * pass to retune the threshold.
 */
const ALL_KNOWN_TOOLS = new Set([
  "Read",
  "Write",
  "Edit",
  "Bash",
  "Glob",
  "Grep",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite",
]);

const rule: Rule = {
  id: "tool-list-too-broad",
  defaultSeverity: "warning",
  description:
    "Description suggests a single narrow action but the tool list is broad (>=6 tools or all known tools).",
  check(subagent) {
    const desc = (subagent.frontmatter.description ?? "").toLowerCase();
    if (!desc) return [];
    const isNarrow = NARROW_VERBS.some(
      (v) => new RegExp(`\\b${v}s?\\b`, "i").test(desc),
    );
    if (!isNarrow) return [];

    const { tools } = getToolList(subagent);
    if (tools.length === 0) return []; // unset = inherit; not our concern

    const knownCount = tools.filter((t) => ALL_KNOWN_TOOLS.has(t)).length;
    const isBroad =
      tools.length >= BROAD_TOOL_THRESHOLD ||
      knownCount === ALL_KNOWN_TOOLS.size;
    if (!isBroad) return [];

    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `description suggests a narrow action but tools = ${tools.length} entries [${tools.join(", ")}].`,
        fix: "Trim tools to those the narrow action actually needs (e.g. 'review' likely needs Read+Grep+Glob, not Bash/Write/Edit/WebFetch).",
      },
    ];
  },
};

export default rule;
