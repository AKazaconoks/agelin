import type { Rule, Issue, ParsedSubagent } from "../types.js";

/**
 * Ordered lists with skipped or duplicated indices ("1, 2, 4" or
 * "1, 2, 2, 3") usually indicate a copy-paste mistake during prompt
 * authoring. Markdown renderers happily renumber the visible output, so
 * the bug is invisible in preview — but an LLM reading the raw text
 * sees the gap and can take cues from it (e.g. "step 3 was deleted on
 * purpose"). We want indices to be 1..N strictly increasing.
 *
 * A "run" is a maximal sequence of adjacent ordered list items at the
 * same indent. We emit at most one suggestion per malformed run so a
 * single typo doesn't produce a wall of warnings.
 *
 * Severity is `suggestion` — a typo in numbering rarely breaks
 * behaviour but reads as careless authoring.
 *
 * TODO(integration): once Unit 1 lands, replace `parseOrderedRuns` with
 * a walk over `subagent.ast?.nodes` filtered to `kind === "list-item"`.
 */

interface InlineListItem {
  index: number;
  indent: number;
  line: number;
}

interface InlineListRun {
  indent: number;
  items: InlineListItem[];
}

/**
 * Inline fallback tokenizer for ordered list items. Skips lines inside
 * fenced code blocks so we don't mistake `1. step` inside a code sample
 * for a real list. Groups items into runs by `(indent, adjacency)`: an
 * item joins the current run when its indent matches AND no non-list
 * non-blank line breaks the sequence.
 */
function parseOrderedRuns(body: string): InlineListRun[] {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const fenceRe = /^(\s*)(```|~~~)\s*([^\s`~]*)\s*$/;
  const orderedRe = /^(\s*)(\d{1,9})[.)]\s+/;

  const runs: InlineListRun[] = [];
  let current: InlineListRun | null = null;

  let inFence = false;
  let openFence: string | null = null;

  const finalize = (): void => {
    if (current && current.items.length > 0) runs.push(current);
    current = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";

    const fenceMatch = line.match(fenceRe);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        openFence = fenceMatch[2] ?? null;
      } else if (fenceMatch[2] === openFence) {
        inFence = false;
        openFence = null;
      }
      finalize();
      continue;
    }
    if (inFence) {
      // Code-block contents never count as list items.
      continue;
    }

    const ol = line.match(orderedRe);
    if (ol) {
      const indent = (ol[1] ?? "").length;
      const indexNum = Number.parseInt(ol[2] ?? "", 10);
      if (!Number.isFinite(indexNum)) continue;
      const item: InlineListItem = { index: indexNum, indent, line: i + 1 };
      if (current && current.indent === indent) {
        current.items.push(item);
      } else {
        finalize();
        current = { indent, items: [item] };
      }
      continue;
    }

    if (line.trim() === "") {
      // Blank lines do not break a run — markdown allows blank-separated
      // ordered list items. Skip without finalising.
      continue;
    }

    // A line that is indented strictly more than the current run's marker
    // is a continuation of the previous list item (lazy-wrap or nested
    // content), not a sibling block — keep the run alive.
    if (current) {
      const lead = line.length - line.replace(/^\s+/, "").length;
      if (lead > current.indent) continue;
    }

    // Any other content (paragraph, heading, unordered item, blockquote)
    // ends the current run.
    finalize();
  }
  finalize();
  return runs;
}

function isSequential(indices: number[]): boolean {
  if (indices.length === 0) return true;
  if (indices[0] !== 1) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }
  return true;
}

const rule: Rule = {
  id: "malformed-list",
  defaultSeverity: "suggestion",
  description:
    "Ordered list indices skip or duplicate (e.g. 1, 2, 4) — should be a strictly increasing 1..N sequence.",
  check(subagent: ParsedSubagent): Issue[] {
    const body = subagent.body;
    if (!body) return [];

    // TODO(integration): prefer walking `subagent.ast?.nodes` once Unit 1 lands.
    const runs = parseOrderedRuns(body);

    const issues: Issue[] = [];
    for (const run of runs) {
      // Single-item runs can't be malformed in any meaningful way.
      if (run.items.length < 2) continue;
      const indices = run.items.map((it) => it.index);
      if (isSequential(indices)) continue;
      const first = run.items[0]!;
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: `ordered list starting at line ${first.line} has indices [${indices.join(
          ", ",
        )}] — expected sequential 1..N.`,
        line: first.line,
        fix: "Renumber to start at 1 and increase by 1, or convert to a bullet list with `-` if order does not matter.",
      });
    }
    return issues;
  },
};

export default rule;
