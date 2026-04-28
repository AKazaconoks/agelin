import type { Rule, Issue } from "../types.js";
import { CANONICAL_TOOLS, getToolList, isMcpTool } from "../parser/tools.js";

/**
 * MCP tool names follow the convention `mcp__<server>__<tool>`. We can't
 * pre-enumerate every MCP server (there are hundreds in the wild) so we
 * accept any name matching that shape as a valid tool reference. The author
 * is responsible for ensuring the MCP server is actually configured.
 */

const rule: Rule = {
  id: "unknown-tool",
  defaultSeverity: "warning",
  description:
    "Frontmatter `tools` lists a name that is not in the canonical Claude Code tool list.",
  check(subagent) {
    const info = getToolList(subagent);
    if (info.source === "missing") return [];

    const issues: Issue[] = [];
    for (const t of info.tools) {
      if (CANONICAL_TOOLS.has(t)) continue;
      if (isMcpTool(t)) continue;
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `unknown tool "${t}". Canonical tools: ${[...CANONICAL_TOOLS].join(", ")}.`,
        fix: `If "${t}" is an MCP tool, ensure it follows the "mcp__<server>__<tool>" naming convention. Otherwise remove it.`,
      });
    }
    return issues;
  },
};

export default rule;
