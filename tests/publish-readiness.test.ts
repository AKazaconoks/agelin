/**
 * Publish-readiness smoke test.
 *
 * The in-tree `bun test` runs against `src/`, so it can't catch problems
 * that only surface when the package is shipped — missing files in the
 * `files` whitelist, a broken `exports` map, or a stale `dist/` that
 * doesn't reflect recent source changes. We pack the package, install
 * it in a clean tmpdir, and exercise both faces of the surface (CLI and
 * library) the way a stranger on npm would.
 *
 * What this catches that other tests don't:
 *   - `dist/` missing (forgot to build)
 *   - `bin` field pointing to a non-shipped file
 *   - `exports` map missing a subpath
 *   - `files` whitelist missing the templates dir
 *   - hashbang stripped by the bundler
 *   - import * from "agelin" failing to resolve types
 *
 * Skipped when the network is offline or `npm` isn't on PATH (CI usually
 * has it; some sandboxed dev shells don't). Use `SKIP_PUBLISH_TEST=1` to
 * skip explicitly during fast inner-loop work.
 */

import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const PROJECT_ROOT = process.cwd();
// Skip when:
//   - explicitly requested via SKIP_PUBLISH_TEST=1. The `prepublish.cjs`
//     wrapper sets this when running tests as part of `npm publish`,
//     because the test spawns `npm pack` / `npm install`, which deadlocks
//     when nested inside an outer npm holding the package lock.
//   - `npm` is unavailable (sandboxed shells).
const SHOULD_SKIP =
  process.env.SKIP_PUBLISH_TEST === "1" ||
  spawnSync("npm", ["--version"], { shell: true }).status !== 0;

let workDir: string;
let tarballPath: string;

function npm(
  args: string[],
  cwd: string,
): { code: number; stdout: string; stderr: string } {
  const out = spawnSync("npm", args, {
    cwd,
    encoding: "utf8",
    shell: true,
    // 4-minute ceiling — `npm install` over a fresh tarball can be slow
    // on cold caches; 4min is loose enough for CI but short enough to fail fast.
    timeout: 4 * 60 * 1000,
  });
  return {
    code: out.status ?? -1,
    stdout: out.stdout ?? "",
    stderr: out.stderr ?? "",
  };
}

describe.skipIf(SHOULD_SKIP)("publish readiness", () => {
  // 60s ceiling on the build+pack: tsc takes ~3-8s, npm pack ~1-3s.
  // Set generously to avoid flake on cold CI runners.
  beforeAll(async () => {
    workDir = mkdtempSync(join(tmpdir(), "agelin-pack-"));

    // 1. Build dist/ from source so we pack the latest code.
    const build = npm(["run", "build"], PROJECT_ROOT);
    if (build.code !== 0) {
      throw new Error(
        `npm run build failed:\nstdout:\n${build.stdout}\nstderr:\n${build.stderr}`,
      );
    }

    // 2. `npm pack` into the tmpdir. `--pack-destination` keeps the cwd
    //    clean and gives us a deterministic file location.
    const pack = npm(
      ["pack", "--pack-destination", workDir, "--silent"],
      PROJECT_ROOT,
    );
    if (pack.code !== 0) {
      throw new Error(`npm pack failed:\n${pack.stderr}`);
    }
    // Last non-empty line of stdout is the tarball filename.
    const filename = pack.stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.endsWith(".tgz"))
      .pop();
    if (!filename) {
      throw new Error(
        `npm pack produced no .tgz filename in stdout: ${JSON.stringify(pack.stdout)}`,
      );
    }
    tarballPath = join(workDir, filename);
    if (!existsSync(tarballPath)) {
      throw new Error(`Tarball not at expected path: ${tarballPath}`);
    }
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  test("tarball includes README, LICENSE, and dist/", () => {
    // `npm pack --json --dry-run` lists files without writing the tarball;
    // we already wrote one above, but listing is the cheap way to inspect
    // contents without untarring.
    const out = npm(
      ["pack", "--dry-run", "--json", "--silent"],
      PROJECT_ROOT,
    );
    expect(out.code).toBe(0);
    const parsed = JSON.parse(out.stdout);
    const files: string[] = (parsed[0]?.files ?? []).map((f: { path: string }) =>
      f.path,
    );
    expect(files).toContain("package.json");
    expect(files).toContain("README.md");
    expect(files).toContain("LICENSE");
    expect(files.some((f) => f === "dist/cli.js")).toBe(true);
    expect(files.some((f) => f === "dist/index.js")).toBe(true);
    expect(files.some((f) => f === "dist/index.d.ts")).toBe(true);
    expect(files.some((f) => f.startsWith("templates/"))).toBe(true);
    // calibration/, targets/, tests/, fixtures/ MUST NOT ship.
    expect(files.some((f) => f.startsWith("calibration/"))).toBe(false);
    expect(files.some((f) => f.startsWith("targets/"))).toBe(false);
    expect(files.some((f) => f.startsWith("tests/"))).toBe(false);
    expect(files.some((f) => f.startsWith("fixtures/"))).toBe(false);
    // Dotfile / dev cruft.
    expect(files).not.toContain(".github/workflows/ci.yml");
    expect(files).not.toContain("bun.lock");
  });

  // 60s ceiling — `npm install <tarball>` takes 3-15s on a warm cache and
  // can spike to 30s+ on a cold one. Default 5s timeout is unrealistic here.
  test("installs into a clean project and the bin runs", () => {
    const consumer = mkdtempSync(join(tmpdir(), "agelin-consumer-"));
    try {
      writeFileSync(
        join(consumer, "package.json"),
        JSON.stringify({ name: "agelin-consumer", version: "0.0.0", private: true }),
        "utf8",
      );

      const install = npm(["install", tarballPath, "--silent"], consumer);
      expect(install.code).toBe(0);

      // Run the installed CLI via npx (uses node_modules/.bin).
      const versionRun = spawnSync("npx", ["agelin", "--version"], {
        cwd: consumer,
        encoding: "utf8",
        shell: true,
        timeout: 30_000,
      });
      expect(versionRun.status).toBe(0);
      expect(versionRun.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    } finally {
      rmSync(consumer, { recursive: true, force: true });
    }
  }, 90_000);

  test("programmatic import resolves and lint() runs", () => {
    const consumer = mkdtempSync(join(tmpdir(), "agelin-lib-consumer-"));
    try {
      writeFileSync(
        join(consumer, "package.json"),
        JSON.stringify({
          name: "agelin-lib-consumer",
          version: "0.0.0",
          private: true,
          type: "module",
        }),
        "utf8",
      );

      const install = npm(["install", tarballPath, "--silent"], consumer);
      expect(install.code).toBe(0);

      // Write a tiny consumer script that exercises the public API and
      // emits one line of output we can assert on.
      const consumerScript = [
        "import { lint, ALL_RULES, VERSION } from 'agelin';",
        "import { writeFileSync, mkdtempSync } from 'node:fs';",
        "import { join } from 'node:path';",
        "import { tmpdir } from 'node:os';",
        "const dir = mkdtempSync(join(tmpdir(), 'agelin-fixtures-'));",
        "writeFileSync(join(dir, 'a.md'), `---\\nname: a\\ndescription: Use when the user asks to test the agelin library import.\\n---\\n\\nDo a thing.\\n`);",
        "const report = await lint(dir);",
        "console.log(`OK rules=${ALL_RULES.length} version=${VERSION} agents=${report.results.length}`);",
      ].join("\n");
      writeFileSync(join(consumer, "smoke.mjs"), consumerScript, "utf8");

      const run = spawnSync("node", ["smoke.mjs"], {
        cwd: consumer,
        encoding: "utf8",
        shell: true,
        timeout: 30_000,
      });
      expect(run.status).toBe(0);
      expect(run.stdout).toContain("OK rules=");
      // Don't hard-pin the rule count — it changes when we add rules.
      // Just assert it's a real number ≥ 30 (we currently ship 34).
      const m = /rules=(\d+)/.exec(run.stdout);
      expect(m).not.toBeNull();
      expect(Number.parseInt(m![1]!, 10)).toBeGreaterThanOrEqual(30);
      expect(run.stdout).toContain("agents=1");
    } finally {
      rmSync(consumer, { recursive: true, force: true });
    }
  }, 90_000);
});
