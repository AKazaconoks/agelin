/**
 * Shared tool-list normalizer + classifications.
 *
 * The frontmatter `tools` field has three valid forms:
 *   - YAML array (preferred):           tools: [Read, Write, Bash]
 *   - comma-separated string (legacy):  tools: "Read, Write, Bash"
 *   - missing entirely (inherit all):   <field absent>
 *
 * Several rules need to read this list. Centralizing the logic here means:
 *   1. Bug fixes apply once.
 *   2. Rules can branch on `source` to handle "inherited" vs "explicit empty".
 *   3. Classifiers (write / read-only / mcp) live next to the canonical list.
 */

import type { ParsedSubagent } from "../types.js";

export interface ToolListInfo {
  tools: string[];
  source: "array" | "comma-string" | "missing" | "malformed";
  raw: unknown;
}

/** Canonical Claude Code built-in tool names. */
export const CANONICAL_TOOLS: ReadonlySet<string> = new Set([
  "Read",
  "Write",
  "Edit",
  "MultiEdit",
  "Bash",
  "Glob",
  "Grep",
  "LS",
  "WebFetch",
  "WebSearch",
  "Task",
  "TodoWrite",
  "NotebookEdit",
  "BashOutput",
  "KillShell",
  "SlashCommand",
  "ExitPlanMode",
]);

/** Tools that mutate the workspace or execute code. */
export const WRITE_TOOLS: ReadonlySet<string> = new Set([
  "Write",
  "Edit",
  "MultiEdit",
  "Bash",
  "NotebookEdit",
]);

/** Tools that only read (filesystem, web, indices). */
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  "Read",
  "Glob",
  "Grep",
  "LS",
  "WebFetch",
  "WebSearch",
]);

const MCP_TOOL_PATTERN = /^mcp__[a-z0-9_-]+__[a-z0-9_-]+$/i;

export function isWriteTool(t: string): boolean {
  return WRITE_TOOLS.has(t);
}

export function isReadOnlyTool(t: string): boolean {
  return READ_ONLY_TOOLS.has(t);
}

export function isMcpTool(t: string): boolean {
  return MCP_TOOL_PATTERN.test(t);
}

/**
 * Normalize the frontmatter `tools` field into a flat list + source tag.
 *
 * `source === "missing"` means the field was absent — Claude Code interprets
 * that as "inherit the parent's tools" (effectively all tools). Rules that
 * scope to "explicitly declared tools only" should skip when source is missing.
 *
 * `source === "malformed"` means the field was present but neither a string
 * nor an array (e.g. an object). Tools list will be empty; rules can decide
 * whether to flag this themselves (the parser already pushes a parseError).
 */
export function getToolList(subagent: ParsedSubagent): ToolListInfo {
  const raw = subagent.frontmatter.tools;
  if (raw === undefined) {
    return { tools: [], source: "missing", raw };
  }
  if (Array.isArray(raw)) {
    const tools = raw.map((t) => String(t).trim()).filter((t) => t.length > 0);
    return { tools, source: "array", raw };
  }
  if (typeof raw === "string") {
    const tools = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return { tools, source: "comma-string", raw };
  }
  return { tools: [], source: "malformed", raw };
}
