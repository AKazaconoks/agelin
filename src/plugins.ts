/**
 * Plugin loader for custom rules.
 *
 * A plugin is an ES module that default-exports a `Plugin` object:
 *
 *   export default {
 *     name: "my-org",
 *     rules: [
 *       {
 *         id: "no-foo",
 *         defaultSeverity: "warning",
 *         description: "...",
 *         check(subagent) { ... }
 *       }
 *     ]
 *   };
 *
 * In `agelin.config.json`:
 *
 *   {
 *     "plugins": ["./my-rules.js", "@vendor/agelin-extras"],
 *     "rules": { "my-org/no-foo": "error" }
 *   }
 *
 * Plugin rule ids are namespaced as `<plugin.name>/<rule.id>` so two
 * plugins (or a plugin and a built-in) can never collide. The user's
 * `rules` map keys against the namespaced id.
 *
 * Specifiers starting with "." or "/" or "X:\" are resolved relative to
 * the config file's directory (NOT cwd — config-relative is more
 * predictable when an agent installs the project in a different shell).
 * Anything else is resolved as a regular bare-module specifier (Node's
 * package resolution kicks in: `node_modules`, etc.).
 */

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Rule } from "./types.js";

export interface Plugin {
  /** Used to namespace this plugin's rule ids: `<name>/<rule.id>`. */
  name: string;
  rules: Rule[];
}

const RELATIVE_PATH_RE = /^(\.{1,2}[\\/]|[\\/]|[A-Za-z]:[\\/])/;

export async function loadPlugins(
  specifiers: string[] | undefined,
  configDir: string,
): Promise<Rule[]> {
  if (!specifiers || specifiers.length === 0) return [];

  const out: Rule[] = [];
  const seenNames = new Set<string>();

  for (const spec of specifiers) {
    const resolved = RELATIVE_PATH_RE.test(spec)
      ? pathToFileURL(resolve(configDir, spec)).href
      : spec;

    let mod: { default?: unknown };
    try {
      mod = (await import(resolved)) as { default?: unknown };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to load plugin "${spec}": ${reason}`);
    }

    const plugin = validatePlugin(mod.default, spec);

    if (seenNames.has(plugin.name)) {
      throw new Error(
        `Two plugins declared the same name "${plugin.name}". Plugin names must be unique.`,
      );
    }
    seenNames.add(plugin.name);

    for (const rule of plugin.rules) {
      const namespacedId = `${plugin.name}/${rule.id}`;
      out.push({
        ...rule,
        id: namespacedId,
        // Wrap `check` so the plugin author can write `ruleId: "no-foo"`
        // in their issues without having to know about namespacing. Any
        // returned issue whose ruleId doesn't already include `/` (or
        // matches the rule's bare id) gets rewritten to the namespaced
        // form so reporters and severity overrides line up.
        check: (subagent) => {
          const issues = rule.check(subagent);
          return issues.map((issue) =>
            issue.ruleId === rule.id || !issue.ruleId.includes("/")
              ? { ...issue, ruleId: namespacedId }
              : issue,
          );
        },
      });
    }
  }
  return out;
}

function validatePlugin(value: unknown, spec: string): Plugin {
  if (value === null || typeof value !== "object") {
    throw new Error(
      `Plugin "${spec}" must default-export an object with { name, rules }.`,
    );
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.name !== "string" || obj.name.length === 0) {
    throw new Error(`Plugin "${spec}" must declare a non-empty string \`name\`.`);
  }
  if (!/^[a-z][a-z0-9-]*$/i.test(obj.name)) {
    throw new Error(
      `Plugin "${spec}" name "${obj.name}" must be a kebab-case identifier (a-z, 0-9, -).`,
    );
  }
  if (!Array.isArray(obj.rules)) {
    throw new Error(`Plugin "${spec}" must declare \`rules\` as an array.`);
  }
  for (const r of obj.rules) {
    if (
      r === null ||
      typeof r !== "object" ||
      typeof (r as { id?: unknown }).id !== "string" ||
      typeof (r as { defaultSeverity?: unknown }).defaultSeverity !== "string" ||
      typeof (r as { check?: unknown }).check !== "function"
    ) {
      throw new Error(
        `Plugin "${spec}" exposed a rule missing required fields (id, defaultSeverity, check).`,
      );
    }
  }
  return obj as unknown as Plugin;
}
