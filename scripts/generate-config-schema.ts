/**
 * Generate `schema/agelin.config.json` from the live rule registry.
 *
 * The schema describes the shape of `agelin.config.json` files that
 * users drop in their repos. VS Code / Cursor / IntelliJ all read the
 * `$schema` field and provide autocomplete + inline validation.
 *
 * Why generate vs. hand-write: the rule registry is the source of truth
 * for rule ids. If the schema lists them by hand, it drifts every time
 * a rule lands or gets renamed. Running this script as part of a
 * release keeps them aligned.
 *
 * Run:
 *   npm run schema:gen
 *
 * The output gets committed to `schema/agelin.config.json` and shipped
 * in the npm tarball (per `files` in package.json). Consumers reference
 * it via `$schema` — the easiest stable URL is JSDelivr's npm proxy:
 *   https://cdn.jsdelivr.net/npm/agelin@latest/schema/agelin.config.json
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_RULES } from "../src/rules/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../schema/agelin.config.json");

const ruleIds = ALL_RULES.map((r) => r.id).sort();

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://cdn.jsdelivr.net/npm/agelin@latest/schema/agelin.config.json",
  title: "agelin.config.json",
  description:
    "Configuration for agelin — quality scorer & benchmark harness for Claude Code subagents. https://github.com/AKazaconoks/agelin",
  type: "object",
  additionalProperties: false,
  properties: {
    $schema: {
      type: "string",
      description: "JSON Schema URL — set by editors automatically.",
    },
    include: {
      type: "array",
      items: { type: "string" },
      default: [".claude/agents/**/*.md"],
      description: "Glob patterns of subagent files to lint, relative to cwd.",
    },
    exclude: {
      type: "array",
      items: { type: "string" },
      default: ["**/node_modules/**"],
      description:
        "Glob patterns to exclude from linting. Applied AFTER `include`.",
    },
    extends: {
      description:
        "Preset(s) to extend from. `agelin:recommended` is the implicit default. Multiple presets compose left-to-right; the user's `rules` field always wins last.",
      oneOf: [
        {
          type: "string",
          enum: ["agelin:recommended", "agelin:strict"],
        },
        {
          type: "array",
          items: {
            type: "string",
            enum: ["agelin:recommended", "agelin:strict"],
          },
        },
      ],
    },
    plugins: {
      type: "array",
      items: { type: "string" },
      description:
        "Plugin module specifiers. Relative paths resolve against this config file's directory; bare specifiers go through Node's package resolution. Each plugin must default-export `{ name: string, rules: Rule[] }`. Plugin rule ids get auto-namespaced as `<plugin-name>/<rule-id>`.",
    },
    rules: {
      type: "object",
      description:
        "Per-rule severity overrides. Wins over `extends`. Use `\"off\"` to disable a rule. Plugin rule keys take the form `<plugin-name>/<rule-id>`.",
      additionalProperties: {
        type: "string",
        enum: ["error", "warning", "suggestion", "off"],
      },
      properties: Object.fromEntries(
        ruleIds.map((id) => {
          const rule = ALL_RULES.find((r) => r.id === id)!;
          return [
            id,
            {
              type: "string",
              enum: ["error", "warning", "suggestion", "off"],
              description: rule.description,
              default: rule.defaultSeverity,
            },
          ];
        }),
      ),
    },
    benchCategories: {
      type: "array",
      items: { type: "string" },
      description:
        "Which categories of golden tasks to run during `agelin bench`. Defaults to all categories under `tasks/`.",
    },
    benchRepeats: {
      type: "integer",
      minimum: 1,
      default: 3,
      description:
        "Number of repeats per (agent, task) pair during `agelin bench`. Used to compute the consistency sub-score.",
    },
    benchModel: {
      type: "string",
      default: "claude-sonnet-4-6",
      description:
        "Anthropic model alias used by `agelin bench --backend=api`. Pick any current Anthropic model id.",
    },
  },
};

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(schema, null, 2) + "\n", "utf8");
console.log(
  `Wrote ${OUT_PATH} — ${ruleIds.length} rules described, ${Object.keys(schema.properties).length} top-level properties.`,
);
