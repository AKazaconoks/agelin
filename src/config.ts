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
import { dirname, resolve } from "node:path";
import { applyExtends } from "./presets.js";
import { loadPlugins } from "./plugins.js";
import { ALL_RULES } from "./rules/index.js";
import { DEFAULT_CONFIG, type Rule, type SubagentLintConfig } from "./types.js";

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

  const merged = mergeConfig(DEFAULT_CONFIG, parsed as Partial<SubagentLintConfig>);
  // Resolve `extends` once at load time against the built-in rule set.
  // Plugin rules — which require async loading — are layered in by the
  // higher-level `loadConfigWithPlugins` helper below; plain `loadConfig`
  // stays sync for callers that don't use plugins.
  return {
    ...merged,
    rules: applyExtends(merged.extends, merged.rules),
  };
}

/**
 * Async config loader that ALSO resolves `plugins` and re-applies
 * `extends` against the merged (built-in + plugin) rule list.
 *
 * Use this from CLI entrypoints; everything downstream then sees a
 * single rule list and a single severity map.
 *
 * @returns the fully-resolved config plus the merged rule list.
 */
export async function loadConfigWithPlugins(
  configPath?: string,
): Promise<{ config: SubagentLintConfig; rules: Rule[] }> {
  const explicit = configPath !== undefined;
  const targetPath = configPath ?? resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);
  const configDir =
    explicit || existsSync(targetPath) ? dirname(targetPath) : process.cwd();

  // First load the config (sync). This already applied `extends` to
  // built-in rules — we'll redo that step once plugin rules are in scope.
  const config = loadConfig(configPath);

  const pluginRules = await loadPlugins(config.plugins, configDir);
  const allRules: Rule[] = [...ALL_RULES, ...pluginRules];

  // Re-resolve `extends` against the FULL rule list so a strict preset
  // also bumps plugin-rule severities.
  const userRules = readUserRules(parseRawConfig(targetPath));
  const rulesMap = applyExtends(config.extends, userRules, allRules);

  return {
    config: { ...config, rules: rulesMap },
    rules: allRules,
  };
}

/**
 * Re-read the user's raw `rules` field from disk so we can compose with
 * the plugin-aware preset map without losing user overrides. This is
 * cheap (one file read) and avoids carrying the raw user fragment
 * through the regular `loadConfig` plumbing.
 */
function parseRawConfig(targetPath: string): unknown {
  if (!existsSync(targetPath)) return {};
  try {
    return JSON.parse(readFileSync(targetPath, "utf8"));
  } catch {
    return {};
  }
}

function readUserRules(parsed: unknown): SubagentLintConfig["rules"] {
  if (parsed === null || typeof parsed !== "object") return undefined;
  const obj = parsed as { rules?: SubagentLintConfig["rules"] };
  return obj.rules;
}

function mergeConfig(
  base: SubagentLintConfig,
  user: Partial<SubagentLintConfig>,
): SubagentLintConfig {
  return {
    include: user.include ?? base.include,
    exclude: user.exclude ?? base.exclude,
    extends: user.extends ?? base.extends,
    plugins: user.plugins ?? base.plugins,
    rules: { ...(base.rules ?? {}), ...(user.rules ?? {}) },
    benchCategories: user.benchCategories ?? base.benchCategories,
    benchRepeats: user.benchRepeats ?? base.benchRepeats,
    benchModel: user.benchModel ?? base.benchModel,
  };
}
