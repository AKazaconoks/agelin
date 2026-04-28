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

  test("auto-fixes code-block-no-language by inserting `text` lang tag", () => {
    const dir = mkdtempSync(join(tmpdir(), "agelin-fix-test-"));
    try {
      const path = join(dir, "agent.md");
      writeFileSync(
        path,
        `---
name: code-fix-test
description: Use when the user asks to verify code-fix behaviour.
---

You are a test agent.

\`\`\`
hello
world
foo
\`\`\`

Done.
`,
        "utf8",
      );

      spawnSync("npx", ["tsx", "src/cli.ts", "fix", path], {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: true,
      });

      const after = readFileSync(path, "utf8");
      // The opening fence got `text` appended; the closing fence stays bare.
      expect(after).toContain("```text");
      expect(after).toMatch(/```text\nhello\nworld\nfoo\n```/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("auto-fixes malformed-list by renumbering 1..N", () => {
    const dir = mkdtempSync(join(tmpdir(), "agelin-fix-test-"));
    try {
      const path = join(dir, "agent.md");
      writeFileSync(
        path,
        `---
name: list-fix-test
description: Use when the user asks to verify list-fix behaviour.
---

You are a test agent.

## Steps

1. First
2. Second
4. Third (should be 3)
5. Fourth (should be 4)

Done.
`,
        "utf8",
      );

      spawnSync("npx", ["tsx", "src/cli.ts", "fix", path], {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: true,
      });

      const after = readFileSync(path, "utf8");
      // The bad sequence (1, 2, 4, 5) becomes (1, 2, 3, 4).
      expect(after).toMatch(/1\. First/);
      expect(after).toMatch(/2\. Second/);
      expect(after).toMatch(/3\. Third/);
      expect(after).toMatch(/4\. Fourth/);
      expect(after).not.toMatch(/4\. Third/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("auto-fixes hardcoded-paths by replacing user-home with ~/", () => {
    const dir = mkdtempSync(join(tmpdir(), "agelin-fix-test-"));
    try {
      const path = join(dir, "agent.md");
      writeFileSync(
        path,
        `---
name: paths-fix-test
description: Use when the user asks to verify hardcoded-path-fix behaviour.
---

You are a test agent. Read files from /home/alice/projects/foo.

The Mac path is /Users/Bob/Desktop/notes.txt.

The Windows path is C:\\Users\\carol\\Documents\\plan.md.

Done.
`,
        "utf8",
      );

      spawnSync("npx", ["tsx", "src/cli.ts", "fix", path], {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: true,
      });

      const after = readFileSync(path, "utf8");
      expect(after).not.toContain("/home/alice/");
      expect(after).not.toContain("/Users/Bob/");
      expect(after).not.toContain("C:\\Users\\carol\\");
      expect(after).toContain("~/projects/foo");
      expect(after).toContain("~/Desktop/notes.txt");
      expect(after).toContain("~/Documents/plan.md");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("hardcoded-paths fixer leaves paths inside code blocks alone", () => {
    const dir = mkdtempSync(join(tmpdir(), "agelin-fix-test-"));
    try {
      const path = join(dir, "agent.md");
      writeFileSync(
        path,
        `---
name: paths-fix-test
description: Use when the user asks to verify code-block exemption.
---

Read from /home/alice/data.txt in prose.

\`\`\`bash
ls /home/alice/data.txt
\`\`\`

Done.
`,
        "utf8",
      );

      spawnSync("npx", ["tsx", "src/cli.ts", "fix", path], {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: true,
      });

      const after = readFileSync(path, "utf8");
      // Prose was rewritten:
      expect(after).toContain("Read from ~/data.txt");
      // Code-block content was preserved:
      expect(after).toContain("ls /home/alice/data.txt");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
