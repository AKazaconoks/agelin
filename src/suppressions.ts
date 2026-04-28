/**
 * Inline disable comments — the ESLint-style escape hatch for rule
 * suppression. Authors mark a rule as off for a specific line, a block,
 * or the rest of the file using HTML comments in the markdown body.
 *
 * Supported directives:
 *
 *   <!-- agelin-disable-next-line -->                     (all rules, next line)
 *   <!-- agelin-disable-next-line rule-a, rule-b -->      (specific rules, next line)
 *   <!-- agelin-disable -->                                (all rules, until enable)
 *   <!-- agelin-disable rule-a, rule-b -->                 (specific rules, until enable)
 *   <!-- agelin-enable -->                                 (re-enable all)
 *   <!-- agelin-enable rule-a -->                          (re-enable rule-a)
 *
 * Multiple rule ids can be comma-separated. Whitespace inside the
 * comment is liberal. Plugin-namespaced ids (`my-org/no-foo`) are
 * supported the same as built-in ids.
 *
 * Issues without a `line` field are suppressed only by file-wide
 * (block-style) directives — not by `disable-next-line`. This avoids
 * silently swallowing issues that the rule couldn't pinpoint.
 */

import type { Issue } from "./types.js";

export interface Suppression {
  /** rule id to suppress, or "*" for all rules. */
  ruleId: string | "*";
  /** 1-indexed inclusive start line. */
  fromLine: number;
  /** 1-indexed inclusive end line. Number.POSITIVE_INFINITY for "until end of file". */
  toLine: number;
}

const DIRECTIVE_RE =
  /<!--\s*agelin-(disable|disable-next-line|enable)(?:\s+([^>]+?))?\s*-->/gi;

/**
 * Walk the body once, accumulating suppressions. The function is pure —
 * call it whenever; cheap (O(lines)).
 */
export function collectSuppressions(body: string): Suppression[] {
  if (!body) return [];
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const out: Suppression[] = [];

  /**
   * Active "block" disables, keyed by rule id. The value is the line
   * the disable started on. When `agelin-enable` is seen, we close the
   * matching open ranges by setting `toLine = enableLine - 1` and
   * pushing them into `out`.
   */
  const activeBlocks = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i] ?? "";
    DIRECTIVE_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = DIRECTIVE_RE.exec(line)) !== null) {
      const kind = (m[1] ?? "").toLowerCase();
      const idsRaw = (m[2] ?? "").trim();
      const ids = idsRaw.length > 0 ? splitIds(idsRaw) : ["*"];

      if (kind === "disable-next-line") {
        // The "next line" is the next line that has any non-comment
        // content. We approximate as `lineNum + 1` — markdown doesn't
        // typically have lines that are *only* directives followed by
        // empty lines, and the false-positive cost is low.
        const target = lineNum + 1;
        for (const id of ids) {
          out.push({ ruleId: id, fromLine: target, toLine: target });
        }
      } else if (kind === "disable") {
        for (const id of ids) {
          if (!activeBlocks.has(id)) activeBlocks.set(id, lineNum);
        }
      } else if (kind === "enable") {
        if (ids.includes("*")) {
          // Close every open block.
          for (const [id, start] of activeBlocks) {
            out.push({ ruleId: id, fromLine: start, toLine: lineNum - 1 });
          }
          activeBlocks.clear();
        } else {
          for (const id of ids) {
            const start = activeBlocks.get(id);
            if (start !== undefined) {
              out.push({ ruleId: id, fromLine: start, toLine: lineNum - 1 });
              activeBlocks.delete(id);
            }
          }
        }
      }
    }
  }

  // Any block still open at EOF runs through the rest of the file.
  for (const [id, start] of activeBlocks) {
    out.push({ ruleId: id, fromLine: start, toLine: Number.POSITIVE_INFINITY });
  }

  return out;
}

function splitIds(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Decide whether an issue is suppressed by any directive.
 *
 * Two cases:
 *   - Issue HAS a `line` — match against directive ranges normally.
 *   - Issue has NO `line` — these are "whole-agent" rules
 *     (`no-examples`, `prompt-too-short`, etc.) that the rule couldn't
 *     pinpoint. ANY block-disable directive (i.e. range > 1 line) that
 *     names the rule suppresses the issue, regardless of where in the
 *     file the directive appears. `disable-next-line` does NOT suppress
 *     a no-line issue, since "next line" is meaningless for whole-agent
 *     issues.
 */
export function isSuppressed(
  issue: Issue,
  suppressions: Suppression[],
): boolean {
  if (suppressions.length === 0) return false;
  const hasLine = typeof issue.line === "number";
  if (hasLine) {
    const targetLine = issue.line!;
    for (const s of suppressions) {
      if (s.ruleId !== "*" && s.ruleId !== issue.ruleId) continue;
      if (targetLine >= s.fromLine && targetLine <= s.toLine) return true;
    }
    return false;
  }
  // No line — only block-disables apply. We tell a block from a
  // disable-next-line by checking if `toLine > fromLine` OR
  // `toLine === Infinity` (open block running to EOF).
  for (const s of suppressions) {
    if (s.ruleId !== "*" && s.ruleId !== issue.ruleId) continue;
    const isBlock =
      s.toLine === Number.POSITIVE_INFINITY || s.toLine > s.fromLine;
    if (isBlock) return true;
  }
  return false;
}
