/**
 * Per-task sandbox: a tmpdir we materialize a GoldenTask's `fixtures` into.
 *
 * The sandbox is the agent's working directory for the duration of a single
 * (agent, task, repeat) run. Tool executors in `tools.ts` clamp every path
 * back to `sandbox.root`, so a misbehaving model can read/write only what we
 * planted here. `dispose()` recursively removes the tmpdir; callers should
 * always wrap usage in try/finally.
 *
 * No daemonized state, no caching across runs: every call to `createSandbox`
 * returns a fresh, isolated directory.
 */

import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import type { GoldenTask } from "../types.js";

export interface Sandbox {
  /** absolute path to the tmpdir root */
  root: string;
  /** remove the tmpdir and everything in it */
  dispose(): Promise<void>;
}

const PREFIX = "agelin-";

/**
 * Create a fresh sandbox tmpdir and write `task.fixtures` into it.
 * Fixture keys are treated as relative paths; any attempt to escape the
 * sandbox root (via `..` segments or absolute paths) is rejected.
 */
export async function createSandbox(task: GoldenTask): Promise<Sandbox> {
  const root = mkdtempSync(join(tmpdir(), PREFIX));
  const fixtures = task.fixtures ?? {};

  for (const [relPath, contents] of Object.entries(fixtures)) {
    const target = safeResolve(root, relPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents, "utf8");
  }

  return {
    root,
    async dispose(): Promise<void> {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        // best-effort cleanup; never throw from dispose
      }
    },
  };
}

/**
 * Resolve `relPath` against `root` and confirm the result stays inside.
 * Throws if the path escapes — fixture authors should not be using absolute
 * paths or `..` segments.
 */
function safeResolve(root: string, relPath: string): string {
  const resolved = resolve(root, relPath);
  const rootWithSep = root.endsWith(sep) ? root : root + sep;
  if (resolved !== root && !resolved.startsWith(rootWithSep)) {
    throw new Error(
      `fixture path escapes sandbox root: ${JSON.stringify(relPath)}`,
    );
  }
  return resolved;
}
