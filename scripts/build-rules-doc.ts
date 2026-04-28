/**
 * Generate docs/rules.md from src/rules/*.ts.
 *
 * For each rule we surface:
 *   - id, severity, description (from the imported Rule object)
 *   - a representative fix-it message (extracted from the rule source)
 *   - a relative source link
 *
 * Rules are grouped by severity (errors first, then warnings, then suggestions)
 * and sorted alphabetically within each severity bucket.
 *
 * Usage:
 *   bun run scripts/build-rules-doc.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { ALL_RULES } from "../src/rules/index.js";
import type { Rule, Severity } from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");
const RULES_DIR = join(REPO_ROOT, "src", "rules");
const OUTPUT_PATH = join(REPO_ROOT, "docs", "rules.md");

const SEVERITY_ORDER: Severity[] = ["error", "warning", "suggestion"];
const SEVERITY_BADGE: Record<Severity, string> = {
  error: "![error](https://img.shields.io/badge/severity-error-red)",
  warning: "![warning](https://img.shields.io/badge/severity-warning-yellow)",
  suggestion: "![suggestion](https://img.shields.io/badge/severity-suggestion-blue)",
};
const SEVERITY_HEADING: Record<Severity, string> = {
  error: "Errors",
  warning: "Warnings",
  suggestion: "Suggestions",
};

interface RuleEntry {
  rule: Rule;
  sourceFile: string;
  sourceRel: string;
  fixExample: string | null;
}

/**
 * Pull the first `fix: "..."` or `fix: '...'` string literal out of a rule
 * source file. Falls back to template-literal extraction. Returns null if
 * the rule never emits a fix hint (some rules are purely informational).
 */
function extractFixExample(source: string): string | null {
  // Match fix: followed by a single- or double-quoted string, possibly with
  // escaped quotes inside. Greedy on the literal body so we capture multi-line
  // fixes that fit on one source line.
  const doubleQuote = /\bfix:\s*"((?:\\"|[^"])*?)"/.exec(source);
  if (doubleQuote) return unescapeJs(doubleQuote[1]);

  const singleQuote = /\bfix:\s*'((?:\\'|[^'])*?)'/.exec(source);
  if (singleQuote) return unescapeJs(singleQuote[1]);

  // Template literal: `fix: \`...\``  (covers interpolated fixes; we keep the
  // ${...} placeholders verbatim so readers see the shape.)
  const template = /\bfix:\s*`([^`]*?)`/.exec(source);
  if (template) return template[1].replace(/\s+/g, " ").trim();

  return null;
}

function unescapeJs(s: string): string {
  return s
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, " ")
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

function ruleSourceFile(rule: Rule): string {
  return join(RULES_DIR, `${rule.id}.ts`);
}

function loadEntry(rule: Rule): RuleEntry {
  const sourceFile = ruleSourceFile(rule);
  const source = readFileSync(sourceFile, "utf8");
  return {
    rule,
    sourceFile,
    sourceRel: relative(REPO_ROOT, sourceFile).replace(/\\/g, "/"),
    fixExample: extractFixExample(source),
  };
}

function renderRule(entry: RuleEntry): string {
  const { rule, sourceRel, fixExample } = entry;
  const lines: string[] = [];
  lines.push(`### \`${rule.id}\``);
  lines.push("");
  lines.push(SEVERITY_BADGE[rule.defaultSeverity]);
  lines.push("");
  lines.push(rule.description);
  lines.push("");
  if (fixExample) {
    lines.push("**Example fix-it:**");
    lines.push("");
    lines.push("> " + fixExample);
    lines.push("");
  } else {
    lines.push("_This rule reports the issue but does not emit a fix-it hint._");
    lines.push("");
  }
  lines.push(`Source: [\`${sourceRel}\`](../${sourceRel})`);
  lines.push("");
  return lines.join("\n");
}

function renderToc(entries: RuleEntry[]): string {
  const lines: string[] = [];
  lines.push("## Rules at a glance");
  lines.push("");
  lines.push("| Rule | Severity | Description |");
  lines.push("| --- | --- | --- |");
  for (const e of entries) {
    const desc = e.rule.description.replace(/\|/g, "\\|").replace(/\s+/g, " ");
    lines.push(`| [\`${e.rule.id}\`](#${anchor(e.rule.id)}) | ${e.rule.defaultSeverity} | ${desc} |`);
  }
  lines.push("");
  return lines.join("\n");
}

function anchor(id: string): string {
  // GitHub anchor: lowercased, non-alnum stripped (keep dashes), surrounding
  // backticks already render as code-anchor variants but the underlying slug
  // is the rule id.
  return id.toLowerCase();
}

function main() {
  const entries = ALL_RULES.map(loadEntry);

  // sort entries: severity bucket asc (error -> warning -> suggestion), then
  // alphabetical within each bucket.
  const sorted = [...entries].sort((a, b) => {
    const sa = SEVERITY_ORDER.indexOf(a.rule.defaultSeverity);
    const sb = SEVERITY_ORDER.indexOf(b.rule.defaultSeverity);
    if (sa !== sb) return sa - sb;
    return a.rule.id.localeCompare(b.rule.id);
  });

  const counts: Record<Severity, number> = {
    error: 0,
    warning: 0,
    suggestion: 0,
  };
  for (const e of entries) counts[e.rule.defaultSeverity]++;

  const out: string[] = [];
  out.push("# Rule reference");
  out.push("");
  out.push(
    `Auto-generated from \`src/rules/*.ts\`. Run \`npm run docs:rules\` to regenerate.`,
  );
  out.push("");
  out.push(`**${entries.length} rules** — ${counts.error} errors, ${counts.warning} warnings, ${counts.suggestion} suggestions.`);
  out.push("");
  out.push(renderToc(sorted));

  for (const sev of SEVERITY_ORDER) {
    const bucket = sorted.filter((e) => e.rule.defaultSeverity === sev);
    if (bucket.length === 0) continue;
    out.push(`## ${SEVERITY_HEADING[sev]}`);
    out.push("");
    for (const e of bucket) out.push(renderRule(e));
  }

  const outDir = dirname(OUTPUT_PATH);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(OUTPUT_PATH, out.join("\n"), "utf8");
  console.log(
    `Wrote ${OUTPUT_PATH} — ${entries.length} rules (${counts.error} errors, ${counts.warning} warnings, ${counts.suggestion} suggestions).`,
  );
}

main();
