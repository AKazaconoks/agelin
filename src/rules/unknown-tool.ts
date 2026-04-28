import type { Rule, Issue } from "../types.js";
import { CANONICAL_TOOLS, getToolList, isMcpTool } from "../parser/tools.js";

/**
 * Frontmatter `tools` lists a name that isn't on Claude Code's built-in
 * tool list and isn't shaped like an MCP tool (`mcp__server__tool`).
 *
 * UX history: pre-0.2.2 this rule emitted ONE issue per unknown tool,
 * each repeating the entire 17-name canonical list. An agent
 * mis-imported from a non-Claude ecosystem (Cline, Cursor, Copilot
 * Workspace) could fire this 20+ times with a wall of duplicate text.
 * Now: at most one coalesced issue per agent, listing the unknown
 * names but pointing at the official docs instead of pasting the full
 * canonical list every time.
 *
 * The canonical list itself lives in `src/parser/tools.ts` and matches
 * the names enumerated in
 * https://docs.claude.com/en/docs/claude-code/sub-agents#agent-configuration .
 * Bump that file (and the docs link below) when Anthropic adds a tool.
 */

const TOOLS_DOC_URL =
  "https://docs.claude.com/en/docs/claude-code/sub-agents#agent-configuration";

const rule: Rule = {
  id: "unknown-tool",
  defaultSeverity: "warning",
  description:
    "Frontmatter `tools` lists a name that is not in the canonical Claude Code tool list (and is not an MCP tool).",
  check(subagent) {
    const info = getToolList(subagent);
    if (info.source === "missing") return [];

    const unknown: string[] = [];
    for (const t of info.tools) {
      if (CANONICAL_TOOLS.has(t)) continue;
      if (isMcpTool(t)) continue;
      unknown.push(t);
    }
    if (unknown.length === 0) return [];

    // Cap the list at 8 names in the message — anything more becomes
    // unreadable. Total count still gets surfaced honestly.
    const previewLimit = 8;
    const preview = unknown.slice(0, previewLimit).map((n) => `"${n}"`).join(", ");
    const overflow = unknown.length - previewLimit;
    const namesPart =
      overflow > 0 ? `${preview}, +${overflow} more` : preview;
    const issueWord = unknown.length === 1 ? "tool" : "tools";

    return [
      {
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message:
          `${unknown.length} unrecognised ${issueWord}: ${namesPart}. ` +
          `Claude Code accepts the 17 built-in tools plus any tool whose name follows the MCP shape "mcp__<server>__<tool>".`,
        fix:
          "Remove names that aren't real Claude Code tools, or rename MCP tools to the `mcp__<server>__<tool>` form. " +
          "If you're porting an agent from another ecosystem (Cline, Cursor, Copilot Workspace) the tool catalogue is different — " +
          "drop the imported tool list and start from Claude's.",
        docUrl: TOOLS_DOC_URL,
      },
    ];
  },
};

export default rule;
