/**
 * Config presets — shareable severity profiles you can opt into via
 * `extends` in `agelin.config.json`.
 *
 *   {
 *     "extends": "agelin:recommended"
 *   }
 *
 *   {
 *     "extends": "agelin:strict",
 *     "rules": { "no-examples": "off" }
 *   }
 *
 * Two presets ship today:
 *   - `agelin:recommended` — every rule at its `defaultSeverity`. Same as
 *     leaving `extends` out entirely. Exists so downstream configs can
 *     write `extends: "agelin:recommended"` for clarity.
 *   - `agelin:strict` — bumps every active rule up one notch (suggestion
 *     -> warning, warning -> error). Disabled rules stay disabled. Useful
 *     when you want a CI gate that fails on anything the linter notices.
 *
 * Preset resolution happens once at config-load time. Downstream code
 * (check, bench, baseline) just reads `config.rules` and never has to
 * know about presets.
 */

import { ALL_RULES } from "./rules/index.js";
import type { Rule, Severity } from "./types.js";

export type SeverityMap = Record<string, Severity | "off">;

const SEVERITY_BUMP: Record<Severity, Severity> = {
  suggestion: "warning",
  warning: "error",
  error: "error",
};

const KNOWN_PRESETS = ["agelin:recommended", "agelin:strict"] as const;
type KnownPreset = (typeof KNOWN_PRESETS)[number];

function isKnownPreset(name: string): name is KnownPreset {
  return (KNOWN_PRESETS as readonly string[]).includes(name);
}

/**
 * Resolve a preset name to a severity map covering the supplied rule list.
 * Defaults to {@link ALL_RULES} so old call sites (no plugins) keep working,
 * but plugin-aware callers should pass `[...ALL_RULES, ...pluginRules]` so
 * `agelin:strict` bumps plugin severities too.
 */
export function resolvePreset(name: string, rules: Rule[] = ALL_RULES): SeverityMap {
  if (!isKnownPreset(name)) {
    throw new Error(
      `Unknown preset "${name}". Valid presets: ${KNOWN_PRESETS.join(", ")}.`,
    );
  }

  const base: SeverityMap = {};
  for (const rule of rules) base[rule.id] = rule.defaultSeverity;

  switch (name) {
    case "agelin:recommended":
      return base;
    case "agelin:strict": {
      const out: SeverityMap = {};
      for (const [id, sev] of Object.entries(base)) {
        if (sev === "off") {
          out[id] = "off";
        } else {
          out[id] = SEVERITY_BUMP[sev];
        }
      }
      return out;
    }
  }
}

/**
 * Compose presets + user overrides into a single severity map.
 * Order: presets in declared order, then user's explicit `rules` last.
 *
 * `rules` defaults to {@link ALL_RULES}. Plugin-aware callers must pass
 * the merged built-in + plugin list so the preset covers everything.
 */
export function applyExtends(
  extendsField: string | string[] | undefined,
  userRules: SeverityMap | undefined,
  rules: Rule[] = ALL_RULES,
): SeverityMap {
  const extendsList = Array.isArray(extendsField)
    ? extendsField
    : extendsField !== undefined
      ? [extendsField]
      : [];

  const resolved: SeverityMap = {};
  for (const name of extendsList) {
    Object.assign(resolved, resolvePreset(name, rules));
  }
  Object.assign(resolved, userRules ?? {});
  return resolved;
}
