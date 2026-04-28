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
 * Coerce gray-matter's `data` into a SubagentFrontmatter shape.
 * We never throw — anything missing/malformed becomes a parseError so the
 * rule layer can flag it (e.g. frontmatter-description-missing).
 */
function normalizeFrontmatter(
  data: Record<string, unknown>,
  parseErrors: string[],
): SubagentFrontmatter {
  const fm: SubagentFrontmatter = {
    name: typeof data.name === "string" ? data.name : "",
    description: typeof data.description === "string" ? data.description : "",
  };

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
  const parseErrors: string[] = [];

  let raw = "";
  try {
    raw = readFileSync(absPath, "utf8");
  } catch (err) {
    parseErrors.push(
      `unable to read file: ${err instanceof Error ? err.message : String(err)}`,
    );
    return {
      path: absPath,
      raw: "",
      frontmatter: { name: "", description: "" },
      body: "",
      bodyTokens: 0,
      parseErrors,
    };
  }

  let data: Record<string, unknown> = {};
  let body = "";
  try {
    const parsed = matter(raw);
    data = (parsed.data ?? {}) as Record<string, unknown>;
    body = parsed.content ?? "";
  } catch (err) {
    parseErrors.push(
      `malformed YAML frontmatter: ${err instanceof Error ? err.message : String(err)}`,
    );
    body = raw;
  }

  const frontmatter = normalizeFrontmatter(data, parseErrors);

  return {
    path: absPath,
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
