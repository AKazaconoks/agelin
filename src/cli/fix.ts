/**
 * `agelin fix [path]` — auto-correct safe rule violations.
 *
 * Default behavior: write changes to disk in place. Pass `--dry-run` to
 * preview without modifying files.
 *
 * Auto-fix philosophy: a fix lands here only when there is exactly one
 * reasonable answer. If the rewrite requires judgment (e.g. "rename file
 * vs change `name:` field"), it stays a suggestion — printed in the
 * issue message — and we don't apply it automatically.
 *
 * Currently auto-fixed:
 *  - `tools-as-string-not-array`     comma-string -> YAML array
 *  - `code-block-no-language`         insert `text` lang tag on bare fences
 *  - `malformed-list`                 renumber 1..N preserving indent + marker
 *  - `hardcoded-paths`                replace /home/<u>/, /Users/<u>/, C:\Users\<u>\ with ~/
 *
 * Stress-tested across 54 wild subagents (see `calibration/fix-stress-report.md`)
 * before each new fixer ships.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import kleur from "kleur";
import matter from "gray-matter";
import { parseSubagentDir } from "../parser/parse.js";
import malformedListRule from "../rules/malformed-list.js";
import type { ParsedSubagent } from "../types.js";

export interface FixOptions {
  path: string;
  /** When true, skip writing. Default: false (write in place). */
  dryRun?: boolean;
}

/**
 * A fixer either mutates the gray-matter frontmatter (for `tools:` etc.)
 * or rewrites the body string. Both kinds use the same callback shape;
 * which one a fixer touches is its own concern.
 */
interface RuleFix {
  ruleId: string;
  /** human-readable summary of the change, shown in console output. */
  before: string;
  after: string;
  apply: (gm: matter.GrayMatterFile<string>) => void;
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

// ---------------------------------------------------------------------------
// Fixer registry
// ---------------------------------------------------------------------------

function collectFixes(subagent: ParsedSubagent): RuleFix[] {
  const fixes: RuleFix[] = [];
  fixes.push(...fixToolsAsStringNotArray(subagent));
  fixes.push(...fixCodeBlockNoLanguage(subagent));
  fixes.push(...fixMalformedList(subagent));
  fixes.push(...fixHardcodedPaths(subagent));
  return fixes;
}

function applyFixes(subagent: ParsedSubagent, fixes: RuleFix[]): string {
  const raw = readFileSync(resolve(subagent.path), "utf8");
  const gm = matter(raw);
  for (const fix of fixes) {
    fix.apply(gm);
  }
  return matter.stringify(gm.content, gm.data);
}

// ---------------------------------------------------------------------------
// Fixer 1: tools-as-string-not-array
// ---------------------------------------------------------------------------

function fixToolsAsStringNotArray(subagent: ParsedSubagent): RuleFix[] {
  const toolsValue = subagent.frontmatter.tools;
  if (typeof toolsValue !== "string") return [];
  const tools = toolsValue
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return [
    {
      ruleId: "tools-as-string-not-array",
      before: `tools: ${toolsValue}`,
      after: `tools:\n  - ${tools.join("\n  - ")}`,
      apply: (gm) => {
        gm.data.tools = tools;
      },
    },
  ];
}

// ---------------------------------------------------------------------------
// Fixer 2: code-block-no-language
//
// The `code-block-no-language` rule fires on a fenced block (≥3 content
// lines) that omits a language tag. We rewrite the opening fence to add
// `text` as the lang. Conservative — `text` is universally accepted and
// produces no syntax-highlighting side effect.
// ---------------------------------------------------------------------------

const FENCE_OPEN_RE = /^(\s*)(```|~~~)\s*$/;

function fixCodeBlockNoLanguage(subagent: ParsedSubagent): RuleFix[] {
  const fixes: RuleFix[] = [];
  if (!subagent.ast) return fixes;

  // Use the AST to identify which fences are missing a lang AND meet the
  // ≥3 content lines threshold (matching the rule's emit logic).
  const targets: { line: number; fence: "```" | "~~~" }[] = [];
  for (const block of subagent.ast.codeBlocks) {
    if (block.lang !== null) continue;
    const contentLines = block.content.split("\n").length;
    if (contentLines < 3) continue;
    targets.push({ line: block.line, fence: block.fence });
  }
  if (targets.length === 0) return fixes;

  fixes.push({
    ruleId: "code-block-no-language",
    before: targets.map((t) => `line ${t.line}: ${t.fence}`).join(", "),
    after: targets.map((t) => `line ${t.line}: ${t.fence}text`).join(", "),
    apply: (gm) => {
      gm.content = rewriteFenceOpenings(gm.content, targets);
    },
  });
  return fixes;
}

function rewriteFenceOpenings(
  body: string,
  targets: { line: number; fence: "```" | "~~~" }[],
): string {
  // Body line numbers in the AST are 1-indexed against the body string
  // (frontmatter is already stripped before tokenization). Operate on a
  // line array so we don't have to worry about regex anchoring.
  const lines = body.split("\n");
  for (const t of targets) {
    const idx = t.line - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const m = (lines[idx] ?? "").match(FENCE_OPEN_RE);
    if (!m) continue; // someone else already touched it
    const indent = m[1] ?? "";
    lines[idx] = `${indent}${t.fence}text`;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Fixer 3: malformed-list
//
// The `malformed-list` rule fires on ordered-list runs whose indices are
// not strictly 1..N (gaps, duplicates). We renumber them to 1..N while
// preserving each item's indent, marker style (`.` vs `)`), and content.
// We do NOT touch nested lists at deeper indent levels — only the run at
// the same indent level as the violation.
// ---------------------------------------------------------------------------

const ORDERED_ITEM_RE = /^(\s*)(\d{1,9})([.)])(\s+)(.*)$/;

function fixMalformedList(subagent: ParsedSubagent): RuleFix[] {
  const fixes: RuleFix[] = [];
  if (!subagent.ast) return fixes;

  // Cheap alignment guard: if the rule itself wouldn't fire here, don't
  // apply the fix. Prevents the AST-based fixer from disagreeing with
  // the rule's line-based `parseOrderedRuns` (e.g. when a wrapped
  // continuation paragraph splits the AST view of an otherwise-clean
  // ordered list). When we share `parseOrderedRuns` between rule and
  // fixer (Sprint 2.5+), this guard becomes redundant.
  if (malformedListRule.check(subagent).length === 0) return fixes;

  // Walk the node list, group consecutive ordered list-items by indent,
  // detect bad runs, plan rewrites.
  type Run = { items: { line: number; index: number; indent: number }[] };
  const runs: Run[] = [];
  let current: Run | null = null;
  let currentIndent = -1;

  for (const node of subagent.ast.nodes) {
    if (
      node.kind === "list-item" &&
      node.ordered &&
      typeof node.index === "number"
    ) {
      if (current && node.indent === currentIndent) {
        current.items.push({ line: node.line, index: node.index, indent: node.indent });
      } else {
        if (current) runs.push(current);
        current = {
          items: [{ line: node.line, index: node.index, indent: node.indent }],
        };
        currentIndent = node.indent;
      }
    } else if (node.kind === "blank") {
      // Allow a single blank line inside a list run.
      continue;
    } else {
      if (current) runs.push(current);
      current = null;
      currentIndent = -1;
    }
  }
  if (current) runs.push(current);

  // Mirror the rule's detection exactly so we never auto-fix something
  // the rule wouldn't have flagged. Single-item runs are skipped (they
  // can't be malformed in any meaningful way), and a run only counts as
  // malformed when its indices aren't strictly 1..N increasing.
  const badRuns = runs.filter(
    (r) => r.items.length >= 2 && isMalformed(r.items),
  );
  if (badRuns.length === 0) return fixes;

  fixes.push({
    ruleId: "malformed-list",
    before: badRuns
      .map((r) => `[${r.items.map((i) => i.index).join(", ")}]`)
      .join(", "),
    after: badRuns
      .map(
        (r) => `[${Array.from({ length: r.items.length }, (_, i) => i + 1).join(", ")}]`,
      )
      .join(", "),
    apply: (gm) => {
      gm.content = rewriteOrderedListRuns(gm.content, badRuns);
    },
  });
  return fixes;
}

function isMalformed(items: { index: number }[]): boolean {
  for (let i = 0; i < items.length; i++) {
    if (items[i]!.index !== i + 1) return true;
  }
  return false;
}

function rewriteOrderedListRuns(
  body: string,
  badRuns: { items: { line: number; index: number }[] }[],
): string {
  const lines = body.split("\n");
  for (const run of badRuns) {
    for (let k = 0; k < run.items.length; k++) {
      const item = run.items[k]!;
      const idx = item.line - 1;
      if (idx < 0 || idx >= lines.length) continue;
      const m = (lines[idx] ?? "").match(ORDERED_ITEM_RE);
      if (!m) continue;
      const [, indent, , delim, ws, rest] = m;
      lines[idx] = `${indent}${k + 1}${delim}${ws}${rest}`;
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Fixer 4: hardcoded-paths
//
// The `hardcoded-paths` rule fires on user-home paths in prose
// (/home/<u>/, /Users/<u>/, C:\Users\<u>\). We replace each with `~/`.
// CRITICAL: skip code blocks — a snippet that legitimately references
// `/home/postgres/data` should not be silently rewritten.
// ---------------------------------------------------------------------------

// Pattern shapes mirror `src/rules/hardcoded-paths.ts` exactly so the
// fixer never edits something the rule wouldn't have flagged. The
// trailing capture group `(rest)` consumes the remainder of the path
// up to the next whitespace / quote / paren / bracket — needed so the
// Windows variant can flip `\` to `/` in the same pass.
//
// Placeholder username segments (`user`, `yourname`, `<user>`, …) are
// allowlisted: those are documentation placeholders, not real paths.
//
// TODO(integration): when the rule and fixer get a shared helper module,
// import PLACEHOLDER_SEGMENTS and PATH_PATTERNS from there.
const PLACEHOLDER_SEGMENTS = new Set([
  "user",
  "username",
  "you",
  "yourname",
  "<user>",
  "<username>",
  "placeholder",
  "name",
]);

interface PathFixPattern {
  /** regex with capture groups: 1 = username segment, 2 = trailing fragment. */
  re: RegExp;
  /** if true, normalize backslashes to forward slashes in the trailing fragment. */
  windows: boolean;
  /** if true, the username segment is part of the prefix and there's no segment to allowlist. */
  isRootHome?: boolean;
}

const USER_HOME_PATTERNS: PathFixPattern[] = [
  // Linux user home: /home/<lowercase-name>/<rest>
  { re: /\/home\/([a-z][a-z0-9_-]*)\/([^\s"'`)\]]*)/g, windows: false },
  // macOS user home: /Users/<UpperCaseName>/<rest>
  { re: /\/Users\/([A-Z][a-zA-Z0-9_-]*)\/([^\s"'`)\]]*)/g, windows: false },
  // Windows user home: C:\Users\<Name>\<rest>  (single or doubled backslash form)
  {
    re: /[Cc]:\\{1,2}[Uu]sers\\{1,2}([A-Za-z][A-Za-z0-9_-]*)\\{1,2}([^\s"'`)\]]*)/g,
    windows: true,
  },
  // /root/<rest> — root user has no segment to allowlist.
  { re: /\/root\/([^\s"'`)\]]*)/g, windows: false, isRootHome: true },
];

function replacePathMatches(text: string): string {
  let out = text;
  for (const pat of USER_HOME_PATTERNS) {
    out = out.replace(pat.re, (full, ...groups: unknown[]) => {
      // For /root/: groups[0] is the trailing fragment; no username.
      // Otherwise: groups[0] is the username, groups[1] is the trailing fragment.
      const segment = pat.isRootHome ? "" : String(groups[0] ?? "");
      const rest = pat.isRootHome
        ? String(groups[0] ?? "")
        : String(groups[1] ?? "");
      if (segment && PLACEHOLDER_SEGMENTS.has(segment.toLowerCase())) {
        return full; // leave placeholder paths alone
      }
      const tail = pat.windows ? rest.replace(/\\/g, "/") : rest;
      return `~/${tail}`;
    });
  }
  return out;
}

function fixHardcodedPaths(subagent: ParsedSubagent): RuleFix[] {
  const body = subagent.body ?? "";
  if (!body) return [];

  // Detect hits OUTSIDE code blocks. The simplest robust approach: split
  // body at fence boundaries, only rewrite the prose segments. A crude
  // tokenizer here is fine — we already pass the AST through the rule
  // for detection; the fixer just needs the same prose-vs-code split.
  // Detect by simulating the rewrite: any segment that changes after
  // replacePathMatches contains at least one match worth fixing. This
  // automatically inherits the placeholder allowlist defined in
  // replacePathMatches, so detection and rewrite never disagree.
  const segments = splitOnFences(body);
  const beforeMatches: string[] = [];
  for (const seg of segments) {
    if (seg.kind !== "prose") continue;
    for (const pat of USER_HOME_PATTERNS) {
      pat.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pat.re.exec(seg.text)) !== null) {
        const segment = pat.isRootHome ? "" : (m[1] ?? "");
        if (segment && PLACEHOLDER_SEGMENTS.has(segment.toLowerCase())) continue;
        // Trim the captured rest so the preview stays on a single line.
        const previewMatch =
          m[0].length > 60 ? m[0].slice(0, 57) + "..." : m[0];
        beforeMatches.push(previewMatch);
      }
    }
  }
  if (beforeMatches.length === 0) return [];

  // Show up to three example matches in the diff preview.
  const previewBefore = beforeMatches.slice(0, 3).join(", ");
  const previewAfter = "~/";
  return [
    {
      ruleId: "hardcoded-paths",
      before: previewBefore,
      after: previewAfter,
      apply: (gm) => {
        gm.content = rewriteHardcodedPaths(gm.content);
      },
    },
  ];
}

interface ProseSegment {
  kind: "prose" | "code";
  text: string;
}

function splitOnFences(body: string): ProseSegment[] {
  const out: ProseSegment[] = [];
  const lines = body.split("\n");
  let buf: string[] = [];
  let inCode = false;
  let activeFence: "```" | "~~~" | null = null;

  function flush(kind: "prose" | "code"): void {
    if (buf.length === 0) return;
    out.push({ kind, text: buf.join("\n") });
    buf = [];
  }

  for (const line of lines) {
    const m = line.match(/^(\s*)(```|~~~)/);
    if (m) {
      const fence = m[2] as "```" | "~~~";
      if (!inCode) {
        flush("prose");
        buf.push(line);
        inCode = true;
        activeFence = fence;
      } else if (fence === activeFence) {
        buf.push(line);
        flush("code");
        inCode = false;
        activeFence = null;
      } else {
        // Mismatched fence inside a code block — treat as content.
        buf.push(line);
      }
    } else {
      buf.push(line);
    }
  }
  flush(inCode ? "code" : "prose");
  return out;
}

function rewriteHardcodedPaths(body: string): string {
  const segments = splitOnFences(body);
  const rebuilt = segments.map((seg) =>
    seg.kind === "code" ? seg.text : replacePathMatches(seg.text),
  );
  return rebuilt.join("\n");
}
