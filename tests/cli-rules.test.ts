/**
 * Verifies `agelin --rules` strictly:
 *   - exits 0
 *   - prints exactly one line per registered rule
 *   - each line matches `<id>  [<severity>]  <description>` with two-space gutters
 *   - lines are sorted by id (alphabetical)
 *
 * Spawns the real CLI via `npx tsx src/cli.ts --rules` so the parseArgs
 * wiring is covered. Looser shape coverage lives in tests/smoke-cli.test.ts.
 */

import { beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { ALL_RULES } from "../src/rules/index.js";

const LINE_RE = /^([a-z][a-z0-9-]*)  \[(error|warning|suggestion)\]  (.+)$/;

let result: { code: number; stdout: string; stderr: string };

beforeAll(() => {
  // Spawn once and reuse — each `npx tsx` cold-start is ~1-2s.
  const out = spawnSync("npx", ["tsx", "src/cli.ts", "--rules"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
  });
  result = {
    code: out.status ?? -1,
    stdout: out.stdout ?? "",
    stderr: out.stderr ?? "",
  };
});

describe("agelin --rules", () => {
  test("exits 0 and prints one line per registered rule", () => {
    expect(result.code).toBe(0);
    const lines = result.stdout.split(/\r?\n/).filter((l) => l.length > 0);
    expect(lines.length).toBe(ALL_RULES.length);
  });

  test("each line has format `<id>  [<severity>]  <description>` with two-space gutters", () => {
    const lines = result.stdout.split(/\r?\n/).filter((l) => l.length > 0);
    for (const line of lines) {
      expect(line).toMatch(LINE_RE);
    }
  });

  test("lines are sorted by id", () => {
    const ids = result.stdout
      .split(/\r?\n/)
      .filter((l) => l.length > 0)
      .map((l) => l.split("  ")[0]!);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  test("output covers every rule in ALL_RULES", () => {
    for (const rule of ALL_RULES) {
      expect(result.stdout).toContain(rule.id);
    }
  });
});
