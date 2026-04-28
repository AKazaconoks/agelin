import type { Rule, Issue } from "../types.js";
import { getToolList } from "../parser/tools.js";

const READ_ONLY_HINTS = ["read-only", "read only", "research", "audit", "review"];
/**
 * Narrow write/exec subset this rule keys on. Intentionally smaller than
 * the shared `WRITE_TOOLS` set in `parser/tools.ts`: this rule has been
 * tuned around Write/Edit/Bash specifically. Broadening would change
 * historical firing rates and is out of scope for the parser refactor.
 */
const WRITE_TOOLS = new Set(["Write", "Edit", "Bash"]);

const rule: Rule = {
  id: "tool-overreach",
  defaultSeverity: "warning",
  description:
    "Agent description claims read-only behavior but tools include write/exec capabilities.",
  check(subagent) {
    const issues: Issue[] = [];
    const desc = subagent.frontmatter.description?.toLowerCase() ?? "";
    const claimsReadOnly = READ_ONLY_HINTS.some((h) => desc.includes(h));
    if (!claimsReadOnly) return issues;

    const { tools } = getToolList(subagent);
    const offenders = tools.filter((t) => WRITE_TOOLS.has(t));
    if (offenders.length > 0) {
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `description suggests read-only / research / audit, but tools include: ${offenders.join(", ")}`,
        fix: `Remove ${offenders.join(", ")} from tools, or rewrite the description to reflect that the agent mutates state.`,
      });
    }
    return issues;
  },
};

export default rule;
