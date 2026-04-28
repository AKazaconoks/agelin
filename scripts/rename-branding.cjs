#!/usr/bin/env node
/**
 * One-shot branding rename: subagent-lint → agelin, kazant → AKazaconoks.
 *
 * Why a script: 30+ files touch the old names. A grep+sed loop would also
 * work, but a script gives us per-file allowlist control and a dry-run
 * mode so we can review the diff before touching the tree.
 *
 * Preserved (intentional historical references):
 *   - src/cli.ts line ~3:  "(Project formerly known as subagent-lint.)"
 *
 * Run:
 *   node scripts/rename-branding.cjs           # apply
 *   node scripts/rename-branding.cjs --dry-run # preview (count + sample)
 */

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

// Files we explicitly preserve a single line in (matched verbatim).
// Everything ELSE in the file is still subject to the rename.
const PRESERVE_LINES = new Set([
  // The "formerly known as" annotation in the CLI header is the one
  // historical breadcrumb we keep.
  "(Project formerly known as subagent-lint.)",
]);

// Path prefixes we never touch:
const SKIP_PREFIXES = [
  "node_modules/",
  "dist/",
  ".git/",
  "calibration/agents/",
  "calibration/agents-extended/",
  "calibration/cycle5-agents/",
  "calibration/fix-stress/",
  "calibration/cycles/", // bench output JSON; about to be untracked
  "targets/",
  "targets-fix-test/",
  ".subagent-lint/",
  ".agelin/",
  "scripts/rename-branding.cjs", // self
  // Files about to be untracked — don't rewrite their content, the
  // historical references stay in the local R&D artifacts they describe.
  "launch/wild-population-static-scan.json",
  "STATUS.md",
  "QUESTIONS-FOR-USER.md",
];

// Binary / unsafe extensions:
const BINARY_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".pdf",
  ".lock", // lockfiles — bun.lock has the old name once; bun regenerates it
  ".lockb",
]);

function isSkipped(rel) {
  for (const prefix of SKIP_PREFIXES) {
    if (rel.startsWith(prefix)) return true;
  }
  if (BINARY_EXTS.has(path.extname(rel))) return true;
  return false;
}

// Get the list of tracked + untracked-but-not-ignored files from git.
// Falls back to a full walk if git isn't usable.
function listFiles() {
  try {
    const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
      .split(/\r?\n/)
      .filter(Boolean);
    const untracked = execSync(
      "git ls-files --others --exclude-standard",
      { cwd: ROOT, encoding: "utf8" },
    )
      .split(/\r?\n/)
      .filter(Boolean);
    return Array.from(new Set([...tracked, ...untracked]));
  } catch (e) {
    console.error("git ls-files failed; aborting:", e.message);
    process.exit(1);
  }
}

// Replace within a single file, returning [newContent, changed].
function transformFile(content) {
  if (!content.includes("subagent-lint") && !content.includes("kazant")) {
    return [content, false];
  }
  const lines = content.split("\n");
  let changed = false;
  const out = lines.map((line) => {
    let replaced = line;

    // Check preserves first — if any preserved phrase is on this line, we
    // skip the substitution entirely. The only preserved phrase is short
    // and unique enough that a substring check is sufficient.
    let preserved = false;
    for (const phrase of PRESERVE_LINES) {
      if (line.includes(phrase)) {
        preserved = true;
        break;
      }
    }
    if (preserved) return line;

    if (replaced.includes("subagent-lint")) {
      replaced = replaced.split("subagent-lint").join("agelin");
    }
    if (replaced.includes("kazant")) {
      replaced = replaced.split("kazant").join("AKazaconoks");
    }
    if (replaced !== line) changed = true;
    return replaced;
  });
  return [out.join("\n"), changed];
}

const files = listFiles();
let touched = 0;
let lineEdits = 0;
const report = [];

for (const rel of files) {
  if (isSkipped(rel)) continue;
  const abs = path.join(ROOT, rel);
  let stat;
  try {
    stat = fs.statSync(abs);
  } catch {
    continue;
  }
  if (!stat.isFile()) continue;

  let content;
  try {
    content = fs.readFileSync(abs, "utf8");
  } catch {
    continue;
  }
  const [next, changed] = transformFile(content);
  if (!changed) continue;

  const beforeCount =
    (content.match(/subagent-lint/g) || []).length +
    (content.match(/kazant/g) || []).length;
  const afterCount =
    (next.match(/subagent-lint/g) || []).length +
    (next.match(/kazant/g) || []).length;
  const edits = beforeCount - afterCount;
  lineEdits += edits;
  touched += 1;
  report.push({ rel, edits, residual: afterCount });

  if (!DRY_RUN) {
    fs.writeFileSync(abs, next, "utf8");
  }
}

report.sort((a, b) => b.edits - a.edits);
console.log(`${DRY_RUN ? "[dry-run] " : ""}Files touched: ${touched}`);
console.log(`${DRY_RUN ? "[dry-run] " : ""}Total replacements: ${lineEdits}`);
console.log("");
console.log("Per-file:");
for (const r of report) {
  const tag = r.residual > 0 ? ` (residual: ${r.residual})` : "";
  console.log(`  ${r.edits.toString().padStart(4)}  ${r.rel}${tag}`);
}
