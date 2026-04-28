/**
 * File-based result cache for benchmark runs.
 *
 * A cache key is the SHA-256 of the canonicalized JSON of:
 *   { agentBody, task, model, runnerVersion }
 *
 * We hash the *whole* agent body (not just the frontmatter name) so editing a
 * subagent invalidates its cached results. `runnerVersion` is bumped manually
 * in this file whenever the runner contract changes in a way that would make
 * old cached RunResults misleading (e.g. tool schema upgrade).
 *
 * Storage: `.agelin/cache/<hex>.json`. Atomic writes via .tmp + rename.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  promises as fsp,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import type { GoldenTask, RunResult } from "../types.js";

/**
 * Bump this when a change in the runner makes cached results no longer
 * comparable to fresh runs. Examples that warrant a bump:
 *   - assertion semantics change
 *   - tool execution (vs. recording) is enabled by default
 *   - new fields added to RunResult that scoring relies on
 */
export const RUNNER_VERSION = "2";

const CACHE_DIR_NAME = ".agelin/cache";

export type CacheKey = string;

export interface CacheKeyInput {
  agentBody: string;
  task: GoldenTask;
  model: string;
  /** 0-based repeat index. Different repeats hash to different keys so a
   * benchmark with `repeats > 1` keeps each run's distinct output instead of
   * having later repeats overwrite earlier ones. Older callers that omitted
   * this field continue to work — a missing repeat hashes the same as
   * `repeat: 0` for back-compat. */
  repeat?: number;
  /** Override the runner version (tests). Defaults to RUNNER_VERSION. */
  runnerVersion?: string;
}

interface CacheFile {
  key: CacheKey;
  result: RunResult;
  cachedAt: string;
}

/**
 * Compute a stable hex digest for the (agent, task, model, runner) tuple.
 * Stable means: same inputs in any object-key order -> same hash.
 */
export function cacheKey(input: CacheKeyInput): CacheKey {
  const canonical = canonicalJsonStringify({
    agentBody: input.agentBody,
    task: input.task,
    model: input.model,
    repeat: input.repeat ?? 0,
    runnerVersion: input.runnerVersion ?? RUNNER_VERSION,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

/** Read a cached RunResult, or null if missing / corrupted. */
export async function getCached(key: CacheKey): Promise<RunResult | null> {
  const path = cacheFilePath(key);
  try {
    const raw = await fsp.readFile(path, "utf8");
    const parsed = JSON.parse(raw) as CacheFile;
    if (!parsed || parsed.key !== key || !parsed.result) return null;
    return parsed.result;
  } catch {
    return null;
  }
}

/** Persist a RunResult under `key`. Atomic via .tmp + rename. */
export async function putCached(key: CacheKey, result: RunResult): Promise<void> {
  const dir = cacheDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const final = cacheFilePath(key);
  const tmp = `${final}.${process.pid}.${Date.now()}.tmp`;
  const payload: CacheFile = {
    key,
    result,
    cachedAt: new Date().toISOString(),
  };
  await fsp.writeFile(tmp, JSON.stringify(payload), "utf8");
  await fsp.rename(tmp, final);
}

/**
 * Delete cache files. With no argument, wipes the whole cache. With
 * `olderThanDays`, only files whose mtime is older than that threshold are
 * removed. Returns the number of entries deleted.
 */
export function clearCache(olderThanDays?: number): number {
  const dir = cacheDir();
  if (!existsSync(dir)) return 0;
  let removed = 0;
  const cutoff =
    typeof olderThanDays === "number"
      ? Date.now() - olderThanDays * 24 * 60 * 60 * 1000
      : null;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    const full = join(dir, entry);
    try {
      if (cutoff !== null) {
        const st = statSync(full);
        if (st.mtimeMs >= cutoff) continue;
      }
      rmSync(full, { force: true });
      removed += 1;
    } catch {
      /* ignore individual failures */
    }
  }
  return removed;
}

// ---------------------------------------------------------------------------

function cacheDir(): string {
  return resolve(process.cwd(), CACHE_DIR_NAME);
}

function cacheFilePath(key: CacheKey): string {
  return join(cacheDir(), `${key}.json`);
}

/**
 * Deterministic JSON.stringify: object keys are sorted recursively. Arrays
 * keep their order (semantically meaningful). Used as the SHA-256 input so
 * key ordering doesn't change the digest.
 */
function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalJsonStringify(v)).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map(
    (k) => JSON.stringify(k) + ":" + canonicalJsonStringify(obj[k]),
  );
  return "{" + parts.join(",") + "}";
}
