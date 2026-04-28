/**
 * Config loading. Reads a JSON config file from disk and merges it on top of
 * DEFAULT_CONFIG so callers always receive a fully-populated config.
 *
 * Resolution order:
 *   1. explicit `configPath` argument (must exist; throws if not)
 *   2. ./agelin.config.json in cwd (used silently if present)
 *   3. DEFAULT_CONFIG
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_CONFIG, type SubagentLintConfig } from "./types.js";

const DEFAULT_CONFIG_FILENAME = "agelin.config.json";

export function loadConfig(configPath?: string): SubagentLintConfig {
  const explicit = configPath !== undefined;
  const targetPath = configPath ?? resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);

  if (!existsSync(targetPath)) {
    if (explicit) {
      throw new Error(`Config file not found: ${targetPath}`);
    }
    return { ...DEFAULT_CONFIG };
  }

  let raw: string;
  try {
    raw = readFileSync(targetPath, "utf8");
  } catch (err) {
    throw new Error(
      `Failed to read config file ${targetPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `Config file ${targetPath} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Config file ${targetPath} must contain a JSON object`);
  }

  return mergeConfig(DEFAULT_CONFIG, parsed as Partial<SubagentLintConfig>);
}

function mergeConfig(
  base: SubagentLintConfig,
  user: Partial<SubagentLintConfig>,
): SubagentLintConfig {
  return {
    include: user.include ?? base.include,
    exclude: user.exclude ?? base.exclude,
    rules: { ...(base.rules ?? {}), ...(user.rules ?? {}) },
    benchCategories: user.benchCategories ?? base.benchCategories,
    benchRepeats: user.benchRepeats ?? base.benchRepeats,
    benchModel: user.benchModel ?? base.benchModel,
  };
}
