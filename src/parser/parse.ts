/**
 * Parser: read a subagent markdown file (YAML frontmatter + body) into ParsedSubagent.
 *
 * Errors are values: malformed YAML or missing fields are pushed to parseErrors[]
 * rather than thrown. Rules can still run on a partially-parsed agent.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, basename, extname } from "node:path";
import matter from "gray-matter";
import type { ParsedSubagent, SubagentFrontmatter } from "../types.js";
import { tokenizeMarkdown } from "./markdown.js";

/** Approximate token count: ~4 chars per token is a decent v0 heuristic. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Turn a raw YAML parse error into a message that explains what likely
 * went wrong AND points at a concrete fix. The wild-corpus scan in 0.2.2
 * showed 14/97 agents fail YAML parsing, and ~all of them hit the
 * same root cause: an unquoted `description:` field that contains
 * `<example>` tags. The YAML parser sees the angle brackets as flow-style
 * mapping syntax and bails. The Anthropic-style template encourages this
 * pattern via "Examples: <example>...</example>" inline.
 */
function explainYamlError(raw: string, err: unknown): string {
  const reason = err instanceof Error ? err.message : String(err);
  const frontmatterEnd = raw.indexOf("\n---", 4);
  const frontmatter = frontmatterEnd > 0 ? raw.slice(0, frontmatterEnd) : raw;

  // Unquoted `<example>` (or other unescaped angle brackets) anywhere
  // in the frontmatter is the dominant failure mode in the wild corpus.
  // Match permissively: the tag may appear inline on the description
  // line OR on a later continuation line. False-positive risk is low
  // because we only enter this branch after the YAML parser already
  // rejected the input.
  if (/<example\b|<\/example>/i.test(frontmatter)) {
    return (
      "frontmatter YAML failed to parse — the `description:` field contains an `<example>` tag (or other angle brackets) without quoting. " +
      'Wrap the description in quotes: `description: "Use when … <example>…</example>"`, or use a YAML block scalar (`description: >-` then indent the next lines). ' +
      `Underlying parser error: ${reason}`
    );
  }

  // Generic fallback — keep the original message visible since the
  // structured-line/column hint is genuinely useful for debugging.
  return `malformed YAML frontmatter: ${reason}`;
}

/**
 * Coerce gray-matter's `data` into a SubagentFrontmatter shape.
 * We never throw — anything missing/malformed becomes a parseError so the
 * rule layer can flag it (e.g. frontmatter-description-missing).
 */
function normalizeFrontmatter(
  data: Record<string, unknown>,
  parseErrors: string[],
  yamlFailed: boolean,
): SubagentFrontmatter {
  const fm: SubagentFrontmatter = {
    name: typeof data.name === "string" ? data.name : "",
    description: typeof data.description === "string" ? data.description : "",
  };

  // Skip cascading errors when YAML parsing already failed: there's no
  // useful `data` to validate, and the missing-name / bad-tools messages
  // would just stack on top of the real issue. The single YAML error
  // already pushed by the caller is more actionable on its own.
  if (yamlFailed) return fm;

  if (!fm.name) parseErrors.push("frontmatter: missing or non-string `name`");

  // tools: keep raw shape (string OR array). The tools-as-string-not-array
  // rule wants to detect the string form, so we must not coerce here.
  if (data.tools !== undefined) {
    if (typeof data.tools === "string") {
      fm.tools = data.tools;
    } else if (Array.isArray(data.tools)) {
      fm.tools = data.tools.map((t) => String(t));
    } else {
      parseErrors.push("frontmatter: `tools` must be a string or array");
    }
  }

  if (typeof data.model === "string") fm.model = data.model;
  if (typeof data.color === "string") fm.color = data.color;
  if (typeof data.category === "string") fm.category = data.category;

  // Preserve unknown extra keys for forward compatibility.
  for (const [k, v] of Object.entries(data)) {
    if (!(k in fm)) fm[k] = v;
  }

  return fm;
}

export function parseSubagent(filePath: string): ParsedSubagent {
  const absPath = resolve(filePath);
  let raw = "";
  try {
    raw = readFileSync(absPath, "utf8");
  } catch (err) {
    return {
      path: absPath,
      raw: "",
      frontmatter: { name: "", description: "" },
      body: "",
      bodyTokens: 0,
      parseErrors: [
        `unable to read file: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }
  return parseSubagentFromString(raw, absPath);
}

/**
 * Parse a subagent from an in-memory string — no filesystem access.
 *
 * Used by the browser playground (which has no `node:fs`) and by
 * library consumers who already have the markdown loaded in memory
 * (e.g., editor extensions that lint the active document buffer).
 *
 * The `displayPath` is used for `ParsedSubagent.path` and surfaces in
 * issue messages; it does not have to exist on disk.
 */
export function parseSubagentFromString(
  raw: string,
  displayPath = "<input>.md",
): ParsedSubagent {
  const parseErrors: string[] = [];
  let data: Record<string, unknown> = {};
  let body = "";
  let yamlFailed = false;
  try {
    const parsed = matter(raw);
    data = (parsed.data ?? {}) as Record<string, unknown>;
    body = parsed.content ?? "";
  } catch (err) {
    yamlFailed = true;
    parseErrors.push(explainYamlError(raw, err));
    body = raw;
  }

  // Suppress cascading "missing name / tools / etc" errors when the YAML
  // itself didn't parse — those secondary errors are inevitable
  // consequences of the primary failure and only add noise. The author
  // can't fix the missing `name` without first fixing the YAML.
  const frontmatter = normalizeFrontmatter(data, parseErrors, yamlFailed);

  return {
    path: displayPath,
    raw,
    frontmatter,
    body,
    bodyTokens: estimateTokens(body),
    parseErrors,
    ast: tokenizeMarkdown(body),
  };
}

/**
 * Walk a directory recursively for *.md files and parse each.
 * Symlinks are followed (via statSync). Hidden directories (starting with ".")
 * other than the entry point itself are skipped to avoid wandering into .git etc.
 */
function walkMarkdown(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkMarkdown(full, out);
    } else if (st.isFile() && extname(name).toLowerCase() === ".md") {
      out.push(full);
    }
  }
}

export function parseSubagentDir(dir: string): ParsedSubagent[] {
  const absDir = resolve(dir);
  const files: string[] = [];

  let st;
  try {
    st = statSync(absDir);
  } catch {
    return [];
  }

  if (st.isFile()) {
    if (extname(absDir).toLowerCase() === ".md") files.push(absDir);
  } else if (st.isDirectory()) {
    walkMarkdown(absDir, files);
  }

  // Stable ordering (filename ascending) so reporters render deterministically.
  files.sort();

  // Skip files that don't even attempt to be subagents (no `---` frontmatter
  // delimiter at the top). README.md, LICENSE.md, and other docs that happen
  // to live in the same directory shouldn't show up as malformed agents.
  // EXCEPTION: when the user passes an explicit single file path, we always
  // include it — the caller likely wants signal even on a malformed file.
  const isSingleFileInput = st.isFile();
  return files
    .filter((f) => isSingleFileInput || hasFrontmatter(f))
    .map((f) => parseSubagent(f));
}

/**
 * Quick heuristic: a file looks like it intends to be a subagent if it
 * starts with the `---` YAML frontmatter delimiter on the first line.
 * Reads only the first 4 bytes to avoid the cost of a full read here.
 */
function hasFrontmatter(filePath: string): boolean {
  try {
    const head = readFileSync(filePath, "utf8").slice(0, 4);
    return head.startsWith("---");
  } catch {
    return false;
  }
}

/** Exported for tests / rules that want to compare a frontmatter `name` to its filename. */
export function fileBaseNameWithoutExt(filePath: string): string {
  return basename(filePath, extname(filePath));
}
