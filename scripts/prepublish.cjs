#!/usr/bin/env node
/**
 * prepublish — runs the in-tree validation chain before `npm publish`.
 *
 * Steps:
 *   1. tsc --noEmit               (typecheck)
 *   2. bun test                   (unit tests; publish-readiness skipped)
 *   3. tsc                        (emit dist/)
 *
 * Why a Node script and not an npm-script chain? We need to set
 * SKIP_PUBLISH_TEST=1 for step 2 in a cross-platform way (Windows cmd
 * doesn't support `VAR=val cmd` POSIX syntax). Adding `cross-env` as a
 * dependency just for this is heavy. A 30-line Node script is portable,
 * dependency-free, and inspectable.
 *
 * The skipped test (`publish-readiness.test.ts`) spawns `npm pack` and
 * `npm install <tarball>`, which deadlocks when nested inside an outer
 * `npm publish`. To run it out-of-band before publishing, use:
 *
 *   npm run verify:publish
 *
 * Why direct paths instead of `npx`? On some Windows + npm combinations,
 * `npx tsc` fails with "This is not the tsc command you are looking for"
 * because npm 7+ stopped auto-resolving the local-bin shim reliably.
 * Resolving the TypeScript entry via `require.resolve` and invoking it
 * with `process.execPath` is platform-agnostic and never fails to find
 * the local TypeScript that we already have as a devDependency.
 */

"use strict";

const { spawnSync } = require("node:child_process");

function run(cmd, args, extraEnv) {
  const env = { ...process.env, ...(extraEnv || {}) };
  console.log(`\n→ ${cmd} ${args.join(" ")}`);
  const out = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: false,
    env,
  });
  if (out.status !== 0) {
    console.error(`\n✗ ${cmd} ${args.join(" ")} exited with code ${out.status}`);
    process.exit(out.status ?? 1);
  }
}

function runShell(cmd, extraEnv) {
  const env = { ...process.env, ...(extraEnv || {}) };
  console.log(`\n→ ${cmd}`);
  const out = spawnSync(cmd, [], {
    stdio: "inherit",
    shell: true,
    env,
  });
  if (out.status !== 0) {
    console.error(`\n✗ ${cmd} exited with code ${out.status}`);
    process.exit(out.status ?? 1);
  }
}

console.log("agelin prepublish: typecheck → tests → build");

// Resolve TypeScript directly. The package ships its CLI entry as a
// plain JS file; we run it with the current Node, which works on every
// platform without depending on PATH or npx.
const tscEntry = require.resolve("typescript/bin/tsc");

run(process.execPath, [tscEntry, "--noEmit"]);

// bun is not a Node package — let `npx --yes` resolve it. `--yes` skips
// the prompt; npx will download and cache bun on first use.
runShell("npx --yes bun test", { SKIP_PUBLISH_TEST: "1" });

run(process.execPath, [tscEntry]);

console.log("\n✓ prepublish ok");
