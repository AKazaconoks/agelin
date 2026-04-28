/**
 * Sandbox lifecycle tests.
 * Verifies fixture materialization and tmpdir cleanup. No real network.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createSandbox } from "../src/eval/sandbox.js";
import type { GoldenTask } from "../src/types.js";

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

describe("createSandbox", () => {
  test("writes fixtures and exposes them under root", async () => {
    const sb = await createSandbox(
      task({
        "hello.txt": "hi there",
        "nested/dir/file.md": "# heading\n",
      }),
    );
    try {
      expect(existsSync(sb.root)).toBe(true);
      expect(readFileSync(join(sb.root, "hello.txt"), "utf8")).toBe("hi there");
      expect(readFileSync(join(sb.root, "nested/dir/file.md"), "utf8")).toBe(
        "# heading\n",
      );
    } finally {
      await sb.dispose();
    }
  });

  test("dispose removes the tmpdir", async () => {
    const sb = await createSandbox(task({ "a.txt": "a" }));
    expect(existsSync(sb.root)).toBe(true);
    await sb.dispose();
    expect(existsSync(sb.root)).toBe(false);
  });

  test("rejects fixture paths that escape the sandbox", async () => {
    let threw = false;
    try {
      await createSandbox(task({ "../escape.txt": "nope" }));
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  test("dispose is idempotent and does not throw", async () => {
    const sb = await createSandbox(task());
    await sb.dispose();
    await sb.dispose();
    // Reaching this line means no throw; explicit pass.
    expect(true).toBe(true);
  });
});
