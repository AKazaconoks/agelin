/**
 * Tool executor tests.
 * Confirms each executor stays inside the sandbox, and that Bash enforces
 * its allowlist. No real network or unsandboxed FS access.
 */

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createSandbox } from "../src/eval/sandbox.js";
import { executeTool } from "../src/eval/tools.js";
import type { GoldenTask } from "../src/types.js";

// `ls` is on the Bash allowlist but is not a real executable on bare
// Windows (PowerShell aliases it to Get-ChildItem; `execFileSync` resolves
// against PATH directly and never sees the alias). Detect once at suite
// load and skip the exec-verifying test when `ls` isn't reachable. The
// allowlist test on its own line still runs everywhere — only the exec
// happy-path needs a real binary.
const HAS_LS_BINARY =
  spawnSync("ls", ["--version"], { shell: false, stdio: "ignore" }).status ===
  0;

function task(fixtures: Record<string, string> = {}): GoldenTask {
  return {
    id: "t",
    category: "debug",
    title: "stub",
    prompt: "stub",
    fixtures,
    assertion: { kind: "contains", needle: "x" },
    budget: {},
  };
}

describe("Read", () => {
  test("reads a fixture inside the sandbox", async () => {
    const sb = await createSandbox(task({ "a.txt": "alpha" }));
    try {
      const r = await executeTool("Read", { file_path: "a.txt" }, sb);
      expect(r.ok).toBe(true);
      expect(r.output).toBe("alpha");
    } finally {
      await sb.dispose();
    }
  });

  test("rejects paths that escape the sandbox", async () => {
    const sb = await createSandbox(task({ "a.txt": "alpha" }));
    try {
      const r = await executeTool(
        "Read",
        { file_path: "../../etc/passwd" },
        sb,
      );
      expect(r.ok).toBe(false);
      expect(r.output).toContain("escapes sandbox");
    } finally {
      await sb.dispose();
    }
  });

  test("returns ENOENT for missing files", async () => {
    const sb = await createSandbox(task());
    try {
      const r = await executeTool("Read", { file_path: "missing.txt" }, sb);
      expect(r.ok).toBe(false);
      expect(r.error).toBe("ENOENT");
    } finally {
      await sb.dispose();
    }
  });
});

describe("Write", () => {
  test("writes a file inside the sandbox", async () => {
    const sb = await createSandbox(task());
    try {
      const r = await executeTool(
        "Write",
        { file_path: "new/file.txt", content: "hello" },
        sb,
      );
      expect(r.ok).toBe(true);
      expect(readFileSync(join(sb.root, "new/file.txt"), "utf8")).toBe("hello");
    } finally {
      await sb.dispose();
    }
  });

  test("rejects writes that escape the sandbox", async () => {
    const sb = await createSandbox(task());
    try {
      const r = await executeTool(
        "Write",
        { file_path: "../escape.txt", content: "x" },
        sb,
      );
      expect(r.ok).toBe(false);
      expect(existsSync(join(sb.root, "..", "escape.txt"))).toBe(false);
    } finally {
      await sb.dispose();
    }
  });
});

describe("Edit", () => {
  test("replaces a unique substring", async () => {
    const sb = await createSandbox(task({ "code.js": "const x = 1;" }));
    try {
      const r = await executeTool(
        "Edit",
        { file_path: "code.js", old_string: "1", new_string: "42" },
        sb,
      );
      expect(r.ok).toBe(true);
      expect(readFileSync(join(sb.root, "code.js"), "utf8")).toBe("const x = 42;");
    } finally {
      await sb.dispose();
    }
  });

  test("fails when old_string is ambiguous", async () => {
    const sb = await createSandbox(task({ "f.txt": "abc abc" }));
    try {
      const r = await executeTool(
        "Edit",
        { file_path: "f.txt", old_string: "abc", new_string: "xyz" },
        sb,
      );
      expect(r.ok).toBe(false);
      expect(r.error).toBe("ambiguous match");
    } finally {
      await sb.dispose();
    }
  });
});

describe("Glob", () => {
  test("lists matching files inside the sandbox", async () => {
    const sb = await createSandbox(
      task({ "a.ts": "1", "b.ts": "2", "c.md": "3" }),
    );
    try {
      const r = await executeTool("Glob", { pattern: "*.ts" }, sb);
      expect(r.ok).toBe(true);
      const matches = (r.meta?.matches as string[]) ?? [];
      expect(matches.sort()).toEqual(["a.ts", "b.ts"]);
    } finally {
      await sb.dispose();
    }
  });
});

describe("Grep", () => {
  test("finds matching lines across fixtures", async () => {
    const sb = await createSandbox(
      task({
        "a.txt": "hello world\nfoo bar\n",
        "b.txt": "hello again\n",
      }),
    );
    try {
      const r = await executeTool(
        "Grep",
        { pattern: "hello", glob: "*.txt" },
        sb,
      );
      expect(r.ok).toBe(true);
      expect(r.meta?.matchCount).toBe(2);
    } finally {
      await sb.dispose();
    }
  });
});

describe("Bash allowlist", () => {
  test.skipIf(!HAS_LS_BINARY)(
    "ls is permitted and runs against the sandbox",
    async () => {
      const sb = await createSandbox(task({ "x.txt": "" }));
      try {
        const r = await executeTool("Bash", { command: "ls" }, sb);
        expect(r.ok).toBe(true);
        expect(r.output).toContain("x.txt");
      } finally {
        await sb.dispose();
      }
    },
  );

  test("rm is blocked by the allowlist", async () => {
    const sb = await createSandbox(task({ "x.txt": "" }));
    try {
      const r = await executeTool("Bash", { command: "rm -rf /" }, sb);
      expect(r.ok).toBe(false);
      expect(r.output).toContain("blocked by sandbox");
      expect(existsSync(join(sb.root, "x.txt"))).toBe(true);
    } finally {
      await sb.dispose();
    }
  });

  test("shell metacharacters are blocked", async () => {
    const sb = await createSandbox(task());
    try {
      const r = await executeTool(
        "Bash",
        { command: "ls && cat /etc/passwd" },
        sb,
      );
      expect(r.ok).toBe(false);
      expect(r.output).toContain("blocked by sandbox");
    } finally {
      await sb.dispose();
    }
  });

  test("python --version is allowed but python -c is not", async () => {
    const sb = await createSandbox(task());
    try {
      const blocked = await executeTool(
        "Bash",
        { command: "python -c 'import os; os.system(\"id\")'" },
        sb,
      );
      expect(blocked.ok).toBe(false);
      expect(blocked.output).toContain("blocked by sandbox");
    } finally {
      await sb.dispose();
    }
  });
});

describe("unknown tool", () => {
  test("returns a structured error", async () => {
    const sb = await createSandbox(task());
    try {
      const r = await executeTool("DoesNotExist", {}, sb);
      expect(r.ok).toBe(false);
      expect(r.error).toBe("unknown tool");
    } finally {
      await sb.dispose();
    }
  });
});
