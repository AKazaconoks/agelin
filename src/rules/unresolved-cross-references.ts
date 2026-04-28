/**
 * unresolved-cross-references
 *
 * Flags an agent whose body references *another* agent — either with an
 * `@agent-name` mention or with phrases like "delegate to security-auditor",
 * "use the code-reviewer agent", "pass to triage" — but does *not* declare
 * the `Task` tool in its frontmatter. Without `Task`, the agent has no way
 * to actually invoke the named subagent at runtime, so the cross-reference
 * is dead text that misleads anyone reading the prompt.
 *
 * Excludes JSDoc/OpenAPI tag false positives (`@param`, `@returns`,
 * `@example`, `@throws`, etc.). If the `tools` field is absent (Claude
 * Code interprets that as "inherit all tools") we cannot tell whether
 * Task is available, so the rule stays quiet.
 *
 * Severity: warning. One issue per agent regardless of match count, with
 * the first three matches surfaced in the message.
 */

import type { Rule, Issue, ParsedSubagent } from "../types.js";

// ---------- inline fallback helpers ----------------------------------------
// Unit 1 lands `getToolList` and `subagent.ast.prose` centrally; until then
// we duplicate just enough of each to keep this rule self-contained. When
// Unit 1 is on master the duplicated logic can be deleted in favour of the
// shared helpers — behaviour is intentionally identical.

interface LocalToolList {
  tools: string[];
  source: "array" | "comma-string" | "missing" | "malformed";
}

function localGetToolList(subagent: ParsedSubagent): LocalToolList {
  const raw = subagent.frontmatter.tools;
  if (raw === undefined) return { tools: [], source: "missing" };
  if (Array.isArray(raw)) {
    const tools = raw.map((t) => String(t).trim()).filter((t) => t.length > 0);
    return { tools, source: "array" };
  }
  if (typeof raw === "string") {
    const tools = raw
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return { tools, source: "comma-string" };
  }
  return { tools: [], source: "malformed" };
}

/** Strip fenced code blocks (``` ... ``` and ~~~ ... ~~~) and lowercase. */
function localProse(body: string): string {
  if (!body) return "";
  // Remove ``` fenced blocks (greedy non-greedy via [\s\S] minimal match).
  let stripped = body.replace(/```[\s\S]*?```/g, "\n");
  stripped = stripped.replace(/~~~[\s\S]*?~~~/g, "\n");
  return stripped.toLowerCase();
}

function getProse(subagent: ParsedSubagent): string {
  const anySub = subagent as ParsedSubagent & { ast?: { prose?: string } };
  if (typeof anySub.ast?.prose === "string") return anySub.ast.prose;
  return localProse(subagent.body ?? "");
}

// ---------- exclusions ------------------------------------------------------
// JSDoc, TSDoc, and OpenAPI annotation tags that look like `@name` mentions
// but never refer to a subagent.
const TAG_EXCLUSIONS: ReadonlySet<string> = new Set([
  "param",
  "params",
  "returns",
  "return",
  "example",
  "throws",
  "since",
  "deprecated",
  "see",
  "link",
  "private",
  "public",
  "protected",
  "internal",
  "override",
  "inheritdoc",
  "default",
  "mention",
  "tag",
]);

// Filler tokens that satisfy the phrase patterns syntactically but never
// name an actual agent (e.g. "delegate to the user", "pass it to me").
const PHRASE_NAME_EXCLUSIONS: ReadonlySet<string> = new Set([
  "the",
  "a",
  "an",
  "it",
  "them",
  "this",
  "that",
  "me",
  "you",
  "us",
  "user",
  "caller",
  "parent",
  "agent",
  "subagent",
]);

// ---------- pattern definitions --------------------------------------------
// `prose` is already lowercased, so all patterns are written in lowercase
// without the `i` flag.
const AT_MENTION_RE = /@([a-z][a-z0-9_-]+)/g;
// Hyphenated identifier patterns that look like agent names.
// Matches `code-reviewer`, `db-migration-reviewer`, etc. (≥1 hyphen).
const HYPHEN_ID = "([a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)+)";
const PHRASE_PATTERNS: RegExp[] = [
  /delegate\s+to\s+(?:the\s+)?@?([a-z][a-z0-9_-]+)/g,
  /use\s+the\s+@?([a-z][a-z0-9_-]+)\s+(?:agent|subagent)/g,
  /pass\s+(?:it\s+)?to\s+(?:the\s+)?@?([a-z][a-z0-9_-]+)/g,
  /hand\s+(?:it\s+)?off\s+to\s+(?:the\s+)?@?([a-z][a-z0-9_-]+)/g,
  // Prose-form collaboration claims ("Collaborate with code-reviewer on …").
  // Require a hyphenated identifier to avoid false-firing on "collaborate
  // with the user" / "coordinate with you". The PHRASE_NAME_EXCLUSIONS set
  // also catches the common single-word filler tokens.
  new RegExp(
    `\\b(?:collaborate|coordinate|partner|sync|engage|consult|align)\\s+with\\s+@?${HYPHEN_ID}`,
    "g",
  ),
  new RegExp(
    `\\bwork\\s+(?:with|alongside)\\s+@?${HYPHEN_ID}\\b`,
    "g",
  ),
  // "Integration with other agents" template-style references followed by
  // a hyphenated agent name in the same paragraph.
  new RegExp(`\\bintegrat(?:e|ion)\\s+with\\s+@?${HYPHEN_ID}`, "g"),
];

interface XrefMatch {
  /** The captured name (without leading `@`). */
  name: string;
  /** The full matched text, used for the user-facing message. */
  display: string;
}

function collectMatches(prose: string): XrefMatch[] {
  if (!prose) return [];
  const seen = new Set<string>();
  const out: XrefMatch[] = [];

  function record(name: string, display: string): void {
    if (TAG_EXCLUSIONS.has(name)) return;
    if (PHRASE_NAME_EXCLUSIONS.has(name)) return;
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ name, display });
  }

  for (const m of prose.matchAll(AT_MENTION_RE)) {
    const name = m[1] ?? "";
    if (!name) continue;
    record(name, `@${name}`);
  }

  for (const re of PHRASE_PATTERNS) {
    for (const m of prose.matchAll(re)) {
      const name = m[1] ?? "";
      if (!name) continue;
      // Collapse runs of whitespace so a phrase that wrapped across a line
      // break (e.g. "hand it off to the\n   db-migration-reviewer") prints
      // as a single readable token in the issue message.
      const display = m[0].replace(/\s+/g, " ").trim();
      record(name, display);
    }
  }

  return out;
}

// ---------- the rule -------------------------------------------------------

const rule: Rule = {
  id: "unresolved-cross-references",
  defaultSeverity: "warning",
  description:
    "Body references other agents (e.g. @code-reviewer, 'delegate to security-auditor') but the Task tool is not declared, so those references cannot be invoked.",
  check(subagent) {
    const issues: Issue[] = [];

    const prose = getProse(subagent);
    if (!prose) return issues;

    const { tools, source } = localGetToolList(subagent);
    // Inherited tools (`tools` field absent) means we don't actually know
    // whether Task is available — silently skip rather than false-fire.
    if (source === "missing") return issues;
    if (tools.includes("Task")) return issues;

    const matches = collectMatches(prose);
    if (matches.length === 0) return issues;

    const preview = matches.slice(0, 3).map((m) => m.display).join(", ");
    issues.push({
      ruleId: rule.id,
      severity: rule.defaultSeverity,
      message: `body references other agents (${preview}) but the Task tool is not declared. Without Task, this agent cannot actually invoke them.`,
      fix: "Add `Task` to the tools list, or remove the cross-references from the body.",
    });

    return issues;
  },
};

export default rule;
