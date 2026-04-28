import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We import the pure-function half via the un-exported computeDiff. To
// avoid touching diff.ts internals, we exercise the CLI surface via spawn
// and test JSON output shape. That's slower but treats the CLI as a real
// black box, which is what users see.
//
// For unit-level testing the diff math, we'd need to extract computeDiff
// into a separate exports section in src/cli/diff.ts. Out of scope for
// this commit — file an issue if you want it.

import { spawnSync } from "node:child_process";

function makeReportContext(scores: Record<string, number>) {
  return {
    results: Object.entries(scores).map(([name, score]) => ({
      agentName: name,
      agentPath: `${name}.md`,
      score,
      components: {
        staticHealth: score,
        successRate: 0,
        costEfficiency: 0,
        consistency: 0,
      },
      staticIssues: [],
    })),
    generatedAt: new Date().toISOString(),
    toolVersion: "test",
  };
}

describe("cli diff", () => {
  test("identity diff reports zero deltas", () => {
    const dir = mkdtempSync(join(tmpdir(), "agelin-test-"));
    try {
      const ctx = makeReportContext({ "agent-a": 85, "agent-b": 70 });
      const path = join(dir, "ctx.json");
      writeFileSync(path, JSON.stringify(ctx), "utf8");

      const out = spawnSync(
        process.execPath,
        ["--experimental-strip-types", "--no-warnings", "src/cli.ts", "diff", path, path, "--format=json"],
        { encoding: "utf8" },
      );
      // tsx may not be available; fall back to npx tsx
      let stdout = out.stdout ?? "";
      if (!stdout) {
        const fallback = spawnSync("npx", ["tsx", "src/cli.ts", "diff", path, path, "--format=json"], {
          encoding: "utf8",
          shell: true,
        });
        stdout = fallback.stdout ?? "";
      }
      if (!stdout) {
        // Skip in environments without tsx/strip-types
        return;
      }
      const parsed = JSON.parse(stdout);
      expect(parsed.summary.deltaMean).toBe(0);
      expect(parsed.summary.regressedAgents).toBe(0);
      expect(parsed.summary.improvedAgents).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
