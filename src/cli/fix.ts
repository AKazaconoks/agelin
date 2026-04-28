/**
 * `agelin fix [path]` — auto-correct safe rule violations.
 *
 * Supports a curated set of rules whose fixes are mechanical and
 * reversible. Default behavior: write changes to disk in place. Pass
 * `--dry-run` to preview without modifying files.
 *
 * v1 supports `tools-as-string-not-array` (rewrite comma-string into a
 * YAML array). The fix has been stress-tested across 40 wild subagents
 * — see `calibration/fix-stress/` — without regressions.
 *
 * Future rules to add (only when the fix is unambiguous):
 *  - `frontmatter-name-mismatch` (rename file or set name field — needs UX)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import kleur from "kleur";
import matter from "gray-matter";
import { parseSubagentDir } from "../parser/parse.js";
import { ALL_RULES, getRule } from "../rules/index.js";
import type { ParsedSubagent } from "../types.js";

const SUPPORTED_FIX_RULES = new Set(["tools-as-string-not-array"]);

export interface FixOptions {
  path: string;
  /** When true, skip writing. Default: false (write in place). */
  dryRun?: boolean;
}

export async function runFix(opts: FixOptions): Promise<void> {
  const subagents = await parseSubagentDir(opts.path);

  let totalChanged = 0;
  for (const subagent of subagents) {
    const fixes = collectFixes(subagent);
    if (fixes.length === 0) continue;

    totalChanged += 1;
    console.log(`\n${kleur.bold(subagent.frontmatter.name || subagent.path)}`);
    for (const fix of fixes) {
      console.log(`  rule:    ${fix.ruleId}`);
      console.log(`  current: ${kleur.red(fix.before)}`);
      console.log(`  fixed:   ${kleur.green(fix.after)}`);
    }

    if (!opts.dryRun) {
      const newContent = applyFixes(subagent, fixes);
      writeFileSync(resolve(subagent.path), newContent, "utf8");
      console.log(`  ${kleur.cyan("wrote")} ${subagent.path}`);
    }
  }

  if (totalChanged === 0) {
    console.log(kleur.green("No auto-fixable issues found."));
    return;
  }

  console.log("");
  if (opts.dryRun) {
    console.log(
      kleur.yellow(
        `${totalChanged} agent(s) with auto-fixable issues. Re-run without --dry-run to apply.`,
      ),
    );
  } else {
    console.log(kleur.green(`Wrote ${totalChanged} file(s).`));
  }
}

interface RuleFix {
  ruleId: string;
  before: string;
  after: string;
  /** Mutator that takes the gray-matter object and applies the change. */
  apply: (gm: matter.GrayMatterFile<string>) => void;
}

function collectFixes(subagent: ParsedSubagent): RuleFix[] {
  const fixes: RuleFix[] = [];

  // tools-as-string-not-array: rewrite "a, b, c" -> array
  const toolsValue = subagent.frontmatter.tools;
  if (typeof toolsValue === "string") {
    const tools = toolsValue
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    fixes.push({
      ruleId: "tools-as-string-not-array",
      before: `tools: ${toolsValue}`,
      after: `tools:\n  - ${tools.join("\n  - ")}`,
      apply: (gm) => {
        gm.data.tools = tools;
      },
    });
  }

  // Touch every supported rule so they actually run (purely a smoke check
  // that the fix paths above remain in sync with the rule list).
  for (const id of SUPPORTED_FIX_RULES) {
    const rule = getRule(id);
    if (!rule) {
      console.warn(`fix: rule "${id}" not found in registry`);
    }
  }

  return fixes;
}

function applyFixes(subagent: ParsedSubagent, fixes: RuleFix[]): string {
  const raw = readFileSync(resolve(subagent.path), "utf8");
  const gm = matter(raw);
  for (const fix of fixes) {
    fix.apply(gm);
  }
  // gray-matter's stringify returns the recombined frontmatter + body,
  // preserving comments where possible.
  return matter.stringify(gm.content, gm.data);
}

// suppress unused-import warning when not in --write path
void ALL_RULES;
