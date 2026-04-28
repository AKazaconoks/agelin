/**
 * Persists the most recent ReportContext so `agelin report` can replay
 * the last run without re-running expensive benchmarks.
 *
 * Storage: `.agelin/last-run.json` in cwd. Created on demand.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { ReportContext } from "./types.js";

const LAST_RUN_DIR = ".agelin";
const LAST_RUN_FILE = "last-run.json";

function lastRunPath(): string {
  return resolve(process.cwd(), LAST_RUN_DIR, LAST_RUN_FILE);
}

export function saveLastRun(ctx: ReportContext): void {
  const target = lastRunPath();
  const dir = dirname(target);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(target, JSON.stringify(ctx, null, 2), "utf8");
}

export function loadLastRun(): ReportContext | null {
  const target = lastRunPath();
  if (!existsSync(target)) {
    return null;
  }
  try {
    const raw = readFileSync(target, "utf8");
    const parsed = JSON.parse(raw) as ReportContext;
    return parsed;
  } catch {
    return null;
  }
}
