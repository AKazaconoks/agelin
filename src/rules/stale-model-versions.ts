import type { Rule, Issue, ParsedSubagent } from "../types.js";

/**
 * stale-model-versions — frontmatter `model` or body references a
 * deprecated/retired Claude model identifier. Curated list; update when
 * Anthropic announces a deprecation. Last reviewed: 2026-04.
 *
 * Stale (as of last review): claude-2, claude-2.1, claude-instant
 * (and dated/numbered variants like claude-instant-1, claude-instant-1.2),
 * claude-3-opus, claude-3-sonnet, claude-3-haiku (and dated suffixes).
 *
 * NOT stale: claude-3-5-sonnet, claude-3-7-sonnet, claude-sonnet-4,
 * claude-opus-4, and the broader Claude 4 family aliases.
 *
 * Detection covers:
 *   1. Frontmatter `model` field.
 *   2. Body PROSE (text outside fenced code blocks). Code blocks may
 *      legitimately contain historical model IDs in migration examples.
 *
 * Severity: `suggestion` — stale references are usually accidental and
 * easy to fix, but they aren't always wrong (e.g., a migration guide).
 */

// TODO(integration): swap `stripCodeBlocks(body)` for `subagent.ast.prose`
// once Unit 1's markdown tokenizer lands. We replace block contents with
// spaces (preserving newlines) so match offsets still map to the original
// body's line numbers.
function stripCodeBlocks(body: string): string {
  return body.replace(/(```|~~~)[\s\S]*?\1/g, (block) =>
    block.replace(/[^\n]/g, " "),
  );
}

// Patterns are matched with `g` so we can iterate over every occurrence.
// Word boundaries (`\b`) on either side prevent us from matching as a
// substring of a longer, current alias (e.g. `claude-3-5-sonnet` must not
// match the `claude-3` pattern). Order matters: longer / more-specific
// patterns first to avoid double-counting.
const STALE_MODEL_PATTERNS: RegExp[] = [
  /\bclaude-3-opus(?:-\d{8})?\b/gi,
  /\bclaude-3-sonnet(?:-\d{8})?\b/gi,
  /\bclaude-3-haiku(?:-\d{8})?\b/gi,
  /\bclaude-instant(?:-\d+(?:\.\d+)?)?\b/gi,
  /\bclaude-2(?:\.\d)?\b/gi,
];

function buildIssue(match: string, line?: number): Issue {
  return {
    ruleId: rule.id,
    severity: rule.defaultSeverity,
    message: `references stale Claude model '${match}'. Update to a current model alias (e.g., \`claude-sonnet-4-6\`, \`claude-haiku-4-5\`).`,
    line,
    fix: "Replace with a current model alias. The Sonnet 4 family is the recommended default as of 2026.",
  };
}

function findFirstMatch(text: string): string | null {
  for (const re of STALE_MODEL_PATTERNS) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

const rule: Rule = {
  id: "stale-model-versions",
  defaultSeverity: "suggestion",
  description:
    "Frontmatter or body references a retired Claude model ID (claude-2, claude-3-opus, claude-3-sonnet, etc.). Update to a current alias.",
  check(subagent: ParsedSubagent): Issue[] {
    const issues: Issue[] = [];
    const seen = new Set<string>();

    // 1. Frontmatter `model` field — single match is enough, the field
    //    only ever holds one model id.
    const modelField = subagent.frontmatter?.model;
    if (typeof modelField === "string" && modelField.length > 0) {
      const match = findFirstMatch(modelField);
      if (match) {
        seen.add(match.toLowerCase());
        issues.push(buildIssue(match));
      }
    }

    // 2. Body prose — every distinct stale id, deduped.
    if (subagent.body) {
      const body = subagent.body;
      const prose = stripCodeBlocks(body);
      for (const re of STALE_MODEL_PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(prose)) !== null) {
          const key = m[0].toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          const line = body.slice(0, m.index).split("\n").length;
          issues.push(buildIssue(m[0], line));
        }
      }
    }

    return issues;
  },
};

export default rule;
