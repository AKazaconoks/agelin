/**
 * `agelin cache <subcommand>` — manage the bench result cache.
 *
 * Subcommands:
 *   clear           wipe all cached bench results
 *   clear --older-than-days=N    wipe entries older than N days
 *   stats           print count + total size + oldest/newest mtime
 */

import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { clearCache } from "../eval/cache.js";

export interface CacheOptions {
  subcommand: "clear" | "stats" | "help";
  olderThanDays?: number;
}

const CACHE_DIR_NAME = ".agelin/cache";

export async function runCache(opts: CacheOptions): Promise<void> {
  switch (opts.subcommand) {
    case "clear": {
      const removed = clearCache(opts.olderThanDays);
      const scope =
        opts.olderThanDays !== undefined
          ? `older than ${opts.olderThanDays} days`
          : "all";
      console.log(`removed ${removed} cache entries (${scope}).`);
      return;
    }
    case "stats": {
      printStats();
      return;
    }
    case "help":
    default:
      console.log(
        "usage: agelin cache <clear|stats> [--older-than-days=N]",
      );
  }
}

function printStats(): void {
  const dir = resolve(process.cwd(), CACHE_DIR_NAME);
  let count = 0;
  let totalBytes = 0;
  let oldest: number | null = null;
  let newest: number | null = null;
  try {
    const entries = readdirSync(dir);
    for (const e of entries) {
      if (!e.endsWith(".json")) continue;
      const full = join(dir, e);
      try {
        const st = statSync(full);
        count += 1;
        totalBytes += st.size;
        const t = st.mtimeMs;
        if (oldest === null || t < oldest) oldest = t;
        if (newest === null || t > newest) newest = t;
      } catch {
        /* skip */
      }
    }
  } catch {
    console.log("Cache directory does not exist (no entries yet).");
    return;
  }
  console.log(`Cache: ${count} entries, ${formatBytes(totalBytes)}`);
  if (oldest !== null) console.log(`Oldest: ${new Date(oldest).toISOString()}`);
  if (newest !== null) console.log(`Newest: ${new Date(newest).toISOString()}`);
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
