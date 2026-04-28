import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = process.cwd();

const SAMPLE_AGENT_WITH_STRING_TOOLS = `---
name: test-agent
description: "Use when the user asks to test something."
tools: Read, Grep, Glob
---

You are a test agent.

## Workflow

Read the file, grep for patterns, return findings.

## Output

Return a markdown report.
`;

describe("cli fix", () => {
  test("--dry-run does NOT modify the file", () => {
    const dir = mkdtempSync(join(tmpdir(), "agelin-fix-test-"));
    try {
      const path = join(dir, "agent.md");
      writeFileSync(path, SAMPLE_AGENT_WITH_STRING_TOOLS, "utf8");
      const before = readFileSync(path, "utf8");

      const out = spawnSync("npx", ["tsx", "src/cli.ts", "fix", path, "--dry-run"], {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: true,
      });

      const after = readFileSync(path, "utf8");
      expect(after).toBe(before);
      // Output should mention the fix
      expect((out.stdout ?? "") + (out.stderr ?? "")).toContain(
        "tools-as-string-not-array",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("default (no flag) writes the file in place", () => {
    const dir = mkdtempSync(join(tmpdir(), "agelin-fix-test-"));
    try {
      const path = join(dir, "agent.md");
      writeFileSync(path, SAMPLE_AGENT_WITH_STRING_TOOLS, "utf8");
      const before = readFileSync(path, "utf8");
      expect(before).toContain("tools: Read, Grep, Glob");

      spawnSync("npx", ["tsx", "src/cli.ts", "fix", path], {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: true,
      });

      const after = readFileSync(path, "utf8");
      // Comma-string -> YAML array
      expect(after).not.toContain("tools: Read, Grep, Glob");
      expect(after).toMatch(/tools:\s*\n\s*-\s*Read/);
      expect(after).toMatch(/-\s*Grep/);
      expect(after).toMatch(/-\s*Glob/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
