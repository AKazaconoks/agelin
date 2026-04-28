/**
 * Tests for the shared tool-list helper at src/parser/tools.ts.
 *
 * Note: this file is named `tool-list.test.ts` (not `tools.test.ts`) to
 * avoid collision with the existing tool-executor sandbox tests which live
 * under that name. Different concern, different module.
 */

import { describe, expect, test } from "bun:test";
import {
  CANONICAL_TOOLS,
  READ_ONLY_TOOLS,
  WRITE_TOOLS,
  getToolList,
  isMcpTool,
  isReadOnlyTool,
  isWriteTool,
} from "../src/parser/tools.js";
import type { ParsedSubagent } from "../src/types.js";

function stub(toolsField: unknown): ParsedSubagent {
  const fm: Record<string, unknown> = { name: "x", description: "y" };
  if (toolsField !== "<absent>") fm.tools = toolsField;
  return {
    path: "/tmp/x.md",
    raw: "",
    frontmatter: fm as ParsedSubagent["frontmatter"],
    body: "",
    bodyTokens: 0,
    parseErrors: [],
  };
}

describe("getToolList", () => {
  test("returns source: missing when frontmatter has no tools field", () => {
    const info = getToolList(stub("<absent>"));
    expect(info.source).toBe("missing");
    expect(info.tools).toEqual([]);
    expect(info.raw).toBeUndefined();
  });

  test("parses YAML array form", () => {
    const info = getToolList(stub(["Read", "Write", "Bash"]));
    expect(info.source).toBe("array");
    expect(info.tools).toEqual(["Read", "Write", "Bash"]);
  });

  test("trims whitespace and drops empty entries from array form", () => {
    const info = getToolList(stub(["  Read  ", "", "Write"]));
    expect(info.tools).toEqual(["Read", "Write"]);
  });

  test("parses comma-separated string form", () => {
    const info = getToolList(stub("Read, Write , Bash"));
    expect(info.source).toBe("comma-string");
    expect(info.tools).toEqual(["Read", "Write", "Bash"]);
  });

  test("empty string -> comma-string source with no tools", () => {
    const info = getToolList(stub(""));
    expect(info.source).toBe("comma-string");
    expect(info.tools).toEqual([]);
  });

  test("malformed object form yields source: malformed and empty tools", () => {
    const info = getToolList(stub({ not: "a list" }));
    expect(info.source).toBe("malformed");
    expect(info.tools).toEqual([]);
  });

  test("array entries are coerced to string", () => {
    const info = getToolList(stub([42, "Read"]));
    expect(info.tools).toEqual(["42", "Read"]);
  });
});

describe("classifiers", () => {
  test("isWriteTool covers Write/Edit/MultiEdit/Bash/NotebookEdit", () => {
    for (const t of ["Write", "Edit", "MultiEdit", "Bash", "NotebookEdit"]) {
      expect(isWriteTool(t)).toBe(true);
    }
    expect(isWriteTool("Read")).toBe(false);
    expect(isWriteTool("Glob")).toBe(false);
  });

  test("isReadOnlyTool covers Read/Glob/Grep/LS/WebFetch/WebSearch", () => {
    for (const t of ["Read", "Glob", "Grep", "LS", "WebFetch", "WebSearch"]) {
      expect(isReadOnlyTool(t)).toBe(true);
    }
    expect(isReadOnlyTool("Write")).toBe(false);
    expect(isReadOnlyTool("Bash")).toBe(false);
  });

  test("isMcpTool matches the canonical mcp__server__tool shape", () => {
    expect(isMcpTool("mcp__github__list_issues")).toBe(true);
    expect(isMcpTool("mcp__a__b")).toBe(true);
    expect(isMcpTool("mcp__a-b__c-d")).toBe(true);
    expect(isMcpTool("MCP__A__B")).toBe(true); // case-insensitive

    expect(isMcpTool("mcp__missing_second_part")).toBe(false);
    expect(isMcpTool("mcp__a__")).toBe(false);
    expect(isMcpTool("mcp_a_b")).toBe(false);
    expect(isMcpTool("Read")).toBe(false);
    expect(isMcpTool("")).toBe(false);
  });

  test("write and read-only sets are disjoint", () => {
    for (const t of WRITE_TOOLS) {
      expect(READ_ONLY_TOOLS.has(t)).toBe(false);
    }
  });

  test("CANONICAL_TOOLS includes all 17 documented Claude Code tools", () => {
    const expected = [
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
    ];
    expect(CANONICAL_TOOLS.size).toBe(expected.length);
    for (const t of expected) {
      expect(CANONICAL_TOOLS.has(t)).toBe(true);
    }
  });
});
