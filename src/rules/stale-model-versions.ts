import type { Rule, Issue, ParsedSubagent } from "../types.js";

/**
 * Stale Claude model reference detection.
 *
 * Agent prompts that name retired or pre-Claude-4 model IDs ("claude-2",
 * "claude-3-opus", "claude-3-5-sonnet", etc.) become a curation hazard:
 * they may continue to dispatch traffic to deprecated endpoints, or worse,
 * confuse readers about which model the prompt was actually tuned for.
 *
 * MAINTENANCE NOTE — this list is curated by hand and MUST be reviewed
 * roughly every 6 months as Anthropic releases new model families. As of
 * 2026 the Claude 4 generation (sonnet-4-6, sonnet-4-7, opus-4-7, haiku-4-5)
 * is current; anything earlier is stale. When a Claude 5 family ships,
 * promote the Claude 4 entries that are no longer recommended into this list.
 *
 * Detection covers:
 *   1. Frontmatter `model` field (matched against any pattern).
 *   2. Body PROSE (text outside fenced code blocks). Code blocks may
 *      legitimately contain historical model IDs in migration examples.
 *
 * Severity: `suggestion` — stale references are usually accidental and
 * easy to fix, but they aren't always wrong (e.g., a migration guide).
 */

// TODO(integration): swap `stripCodeBlocks(body)` for `subagent.ast.prose`
// once Unit 1's markdown tokenizer lands.
function stripCodeBlocks(body: string): string {
  return body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");
}

const STALE_MODEL_PATTERNS: RegExp[] = [
  /\bclaude-2(?:\.\d)?\b/gi,
  /\bclaude-instant\b/gi,
  /\bclaude-3-opus\b/gi,
  /\bclaude-3-sonnet\b/gi,
  /\bclaude-3-haiku\b/gi,
  /\bclaude-3-5-sonnet\b/gi,
  /\bclaude-3-5-haiku\b/gi,
];

function buildIssue(match: string): Issue {
  return {
    ruleId: rule.id,
    severity: rule.defaultSeverity,
    message: `references stale Claude model '${match}'. Update to a current model alias (e.g., \`claude-sonnet-4-6\`, \`claude-haiku-4-5\`).`,
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
    "Frontmatter or body references a retired Claude model ID (claude-2, claude-3-opus, claude-3-5-sonnet, etc.). Update to a current alias.",
  check(subagent: ParsedSubagent): Issue[] {
    const issues: Issue[] = [];
    const seen = new Set<string>();

    // 1. Frontmatter `model` field — single match is enough, the field
    //    only ever holds one model id.
    const modelField = subagent.frontmatter?.model;
    if (typeof modelField === "string" && modelField.length > 0) {
      const match = findFirstMatch(modelField);
      if (match) {
        const key = match.toLowerCase();
        seen.add(key);
        issues.push(buildIssue(match));
      }
    }

    // 2. Body prose — every distinct stale id, deduped.
    if (subagent.body) {
      const prose = stripCodeBlocks(subagent.body);
      for (const re of STALE_MODEL_PATTERNS) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(prose)) !== null) {
          const key = m[0].toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          issues.push(buildIssue(m[0]));
        }
      }
    }

    return issues;
  },
};

export default rule;
