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
 */

"use strict";

const { spawnSync } = require("node:child_process");

const isWindows = process.platform === "win32";
// On Windows, npm/npx/tsc live as .cmd shims; spawning them without a
// shell needs the .cmd suffix or `shell: true`. Using shell: true is
// simpler and equivalent for trusted command strings here.
const SHELL = true;

function run(cmd, args, extraEnv) {
  const env = { ...process.env, ...(extraEnv || {}) };
  console.log(`\n→ ${cmd} ${args.join(" ")}`);
  const out = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: SHELL,
    env,
  });
  if (out.status !== 0) {
    console.error(`\n✗ ${cmd} ${args.join(" ")} exited with code ${out.status}`);
    process.exit(out.status ?? 1);
  }
}

console.log("agelin prepublish: typecheck → tests → build");

run("npx", ["tsc", "--noEmit"]);
run("npx", ["bun", "test"], { SKIP_PUBLISH_TEST: "1" });
run("npx", ["tsc"]);

console.log("\n✓ prepublish ok");
