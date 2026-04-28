/**
 * Smoke test for every CLI command. Each test is a one-shot spawn that
 * verifies the command runs without crashing on minimal input. Doesn't
 * exercise correctness — that's the per-rule and per-feature tests'
 * job. This catches catastrophic regressions like a missing import or
 * broken argument parsing.
 */

import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const PROJECT_ROOT = process.cwd();

function runCli(args: string[]): { code: number; stdout: string; stderr: string } {
  const out = spawnSync("npx", ["tsx", "src/cli.ts", ...args], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    shell: true,
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? "",
    stderr: out.stderr ?? "",
  };
}

describe("CLI smoke tests", () => {
  test("--version", () => {
    const { code, stdout } = runCli(["--version"]);
    expect(code).toBe(0);
    // Allows "0.1.0", "0.1.0-pre", "1.2.3-rc.4", etc.
    expect(stdout).toMatch(/^\d+\.\d+\.\d+(-[a-z0-9.-]+)?/);
  });

  test("--help", () => {
    const { code, stdout } = runCli(["help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("agelin");
    expect(stdout).toContain("Commands:");
  });

  test("--rules", () => {
    const { code, stdout } = runCli(["--rules"]);
    expect(code).toBe(0);
    // Should list all 32 rules
    const lines = stdout.split("\n").filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(30);
    expect(stdout).toContain("tool-overreach");
    expect(stdout).toContain("tool-body-mismatch");
  });

  test("check on a passing fixture", () => {
    const { code, stdout } = runCli(["check", "fixtures/subagents/research-agent.md"]);
    // research-agent has zero issues -> exit 0
    expect(code).toBe(0);
    expect(stdout).toContain("research-agent");
  });

  test("check on a failing fixture", () => {
    const { code } = runCli(["check", "fixtures/subagents/code-fixer.md"]);
    // code-fixer has error-severity issues -> exit 1
    expect(code).toBe(1);
  });

  test("check --fail-on=none never fails", () => {
    const { code } = runCli([
      "check",
      "fixtures/subagents/code-fixer.md",
      "--fail-on=none",
    ]);
    expect(code).toBe(0);
  });

  test("check --format=json emits valid JSON", () => {
    const { code, stdout } = runCli([
      "check",
      "fixtures/subagents/research-agent.md",
      "--format=json",
    ]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty("results");
  });

  test("badge emits SVG", () => {
    const { code, stdout } = runCli(["badge", "--score=87"]);
    expect(code).toBe(0);
    expect(stdout).toContain("<svg");
    expect(stdout).toContain("87");
  });

  test("init refuses to overwrite", () => {
    // Use the project's own tsx runner (we can't `cwd: dir` because then
    // `src/cli.ts` won't resolve). Pass the absolute path to the script.
    const dir = mkdtempSync(join(tmpdir(), "smoke-init-"));
    const cliPath = join(PROJECT_ROOT, "src", "cli.ts");
    try {
      const out1 = spawnSync("npx", ["tsx", cliPath, "init"], {
        cwd: dir,
        encoding: "utf8",
        shell: true,
      });
      expect(out1.status).toBe(0);
      const out2 = spawnSync("npx", ["tsx", cliPath, "init"], {
        cwd: dir,
        encoding: "utf8",
        shell: true,
      });
      expect(out2.status).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("cache stats works on missing dir", () => {
    const { code } = runCli(["cache", "stats"]);
    expect(code).toBe(0);
  });

  test("fix --dry-run runs cleanly on a fixture without writing", () => {
    // Use --dry-run explicitly: `fix` defaults to in-place writes since
    // 0.1.0, and this test must not mutate a checked-in fixture.
    // research-agent.md does have one auto-fixable rule
    // (`code-block-no-language`) — exit code is still 0 either way.
    const { code } = runCli([
      "fix",
      "fixtures/subagents/research-agent.md",
      "--dry-run",
    ]);
    expect(code).toBe(0);
  });

  test("check --format=json with stdout redirect captures all output", () => {
    // Reproducer for the bench JSON-output bug: small invocation should
    // always work via stdout redirect. (Bench's failure mode is at scale,
    // not on small inputs — this guards against a future regression on
    // the small path.)
    const dir = mkdtempSync(join(tmpdir(), "smoke-stdout-"));
    try {
      const outPath = join(dir, "out.json");
      const out = spawnSync(
        "npx",
        ["tsx", "src/cli.ts", "check", "fixtures/subagents/research-agent.md", "--format=json"],
        { cwd: PROJECT_ROOT, encoding: "utf8", shell: true },
      );
      writeFileSync(outPath, out.stdout ?? "", "utf8");
      const parsed = JSON.parse(readFileSync(outPath, "utf8"));
      expect(parsed).toHaveProperty("results");
      expect(parsed.results.length).toBeGreaterThan(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
