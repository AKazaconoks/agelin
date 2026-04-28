/**
 * Tool executors for the eval harness.
 *
 * Each function maps one Claude Code-style tool (Read, Write, Edit, Glob,
 * Grep, Bash) onto safe Node.js APIs scoped to a per-task `Sandbox`. The
 * dispatcher `executeTool` is what `conversation.ts` calls when the model
 * emits a `tool_use` block; it returns a `ToolResult` regardless of success
 * or failure, so the conversation loop can always feed something back as a
 * `tool_result` content block.
 *
 * Hard rules:
 *   - Every filesystem path is clamped under `sandbox.root`. Escape attempts
 *     return `{ ok: false }` with an explanatory error; we do not throw.
 *   - `Bash` runs via `execFileSync` against a tiny allowlist. Anything else
 *     short-circuits with a "blocked by sandbox" message and exit code 1.
 *   - No spawning of external search tools (ripgrep, etc). `Grep` is a pure
 *     line-by-line walk of files matched by `Glob`.
 *
 * The `output` field is a plain string suitable for embedding in a
 * `tool_result` content block. Errors land in `error` and `output` is set to
 * a short human-readable summary.
 */

import {
  existsSync,
  globSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";
import type { Sandbox } from "./sandbox.js";

export interface ToolResult {
  ok: boolean;
  output: string;
  error?: string;
  /** structured side-data for assertion/inspection (e.g. before/after edit) */
  meta?: Record<string, unknown>;
}

export type ToolName =
  | "Read"
  | "Write"
  | "Edit"
  | "Glob"
  | "Grep"
  | "Bash"
  | string;

// ---------------------------------------------------------------------------
// Bash allowlist
//
// We accept only the small set of read-only / version-probe commands the
// benchmark actually exercises. Anything else is rejected before spawning so
// a model can't escape the sandbox via creative shell pipelines.
// Each entry is `command -> [allowedArgsPredicates]`. Empty means "no args".

const BASH_ALLOWLIST: Record<string, (args: string[]) => boolean> = {
  ls: () => true,
  cat: () => true,
  head: () => true,
  tail: () => true,
  wc: () => true,
  grep: () => true,
  find: () => true,
  python: (args) => args.length === 1 && args[0] === "--version",
  python3: (args) => args.length === 1 && args[0] === "--version",
  node: (args) => args.length === 1 && args[0] === "--version",
  go: (args) => args.length === 1 && args[0] === "version",
  tsc: (args) => args.length === 1 && args[0] === "--version",
  pytest: (args) => args.length === 1 && args[0] === "--version",
};

const BASH_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Dispatcher

export async function executeTool(
  name: ToolName,
  input: unknown,
  sandbox: Sandbox,
): Promise<ToolResult> {
  const obj = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "Read":
      return toolRead(asString(obj.file_path ?? obj.path), sandbox);
    case "Write":
      return toolWrite(
        asString(obj.file_path ?? obj.path),
        asString(obj.content),
        sandbox,
      );
    case "Edit":
      return toolEdit(
        asString(obj.file_path ?? obj.path),
        asString(obj.old_string),
        asString(obj.new_string),
        sandbox,
      );
    case "Glob":
      return toolGlob(asString(obj.pattern), sandbox);
    case "Grep":
      return toolGrep(asString(obj.pattern), obj, sandbox);
    case "Bash":
      return toolBash(asString(obj.command), sandbox);
    default:
      return {
        ok: false,
        output: `tool "${name}" is not implemented in this sandbox`,
        error: "unknown tool",
      };
  }
}

// ---------------------------------------------------------------------------
// Read

function toolRead(filePath: string, sandbox: Sandbox): ToolResult {
  const resolved = resolveInside(sandbox.root, filePath);
  if (resolved === null) {
    return escapeError(filePath);
  }
  if (!existsSync(resolved)) {
    return {
      ok: false,
      output: `file not found: ${relativeOrSelf(sandbox.root, resolved)}`,
      error: "ENOENT",
    };
  }
  try {
    const contents = readFileSync(resolved, "utf8");
    return { ok: true, output: contents };
  } catch (err) {
    return {
      ok: false,
      output: `read failed: ${errMsg(err)}`,
      error: errMsg(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Write

function toolWrite(
  filePath: string,
  content: string,
  sandbox: Sandbox,
): ToolResult {
  const resolved = resolveInside(sandbox.root, filePath);
  if (resolved === null) {
    return escapeError(filePath);
  }
  try {
    mkdirSync(dirname(resolved), { recursive: true });
    writeFileSync(resolved, content, "utf8");
    return {
      ok: true,
      output: `wrote ${content.length} bytes to ${relativeOrSelf(sandbox.root, resolved)}`,
    };
  } catch (err) {
    return {
      ok: false,
      output: `write failed: ${errMsg(err)}`,
      error: errMsg(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Edit

function toolEdit(
  filePath: string,
  oldString: string,
  newString: string,
  sandbox: Sandbox,
): ToolResult {
  const resolved = resolveInside(sandbox.root, filePath);
  if (resolved === null) {
    return escapeError(filePath);
  }
  if (!existsSync(resolved)) {
    return {
      ok: false,
      output: `file not found: ${relativeOrSelf(sandbox.root, resolved)}`,
      error: "ENOENT",
    };
  }
  let before: string;
  try {
    before = readFileSync(resolved, "utf8");
  } catch (err) {
    return {
      ok: false,
      output: `read failed: ${errMsg(err)}`,
      error: errMsg(err),
    };
  }

  if (oldString === newString) {
    return {
      ok: false,
      output: "old_string and new_string are identical",
      error: "noop edit",
    };
  }
  if (!before.includes(oldString)) {
    return {
      ok: false,
      output: `old_string not found in file`,
      error: "missing match",
    };
  }
  // Match the harness Edit semantics: must be unique. If it appears more than
  // once, fail and ask the caller to disambiguate.
  const firstIdx = before.indexOf(oldString);
  const nextIdx = before.indexOf(oldString, firstIdx + 1);
  if (nextIdx !== -1) {
    return {
      ok: false,
      output: "old_string is not unique; provide more context",
      error: "ambiguous match",
    };
  }
  const after = before.slice(0, firstIdx) + newString + before.slice(firstIdx + oldString.length);
  try {
    writeFileSync(resolved, after, "utf8");
  } catch (err) {
    return {
      ok: false,
      output: `write failed: ${errMsg(err)}`,
      error: errMsg(err),
    };
  }
  return {
    ok: true,
    output: `edited ${relativeOrSelf(sandbox.root, resolved)} (1 replacement)`,
    meta: { before, after },
  };
}

// ---------------------------------------------------------------------------
// Glob

function toolGlob(pattern: string, sandbox: Sandbox): ToolResult {
  if (!pattern) {
    return { ok: false, output: "empty pattern", error: "bad input" };
  }
  try {
    // Node's globSync resolves matches relative to `cwd`. We constrain it to
    // the sandbox root and post-filter for paranoia.
    const matches = globSync(pattern, { cwd: sandbox.root });
    const safe: string[] = [];
    for (const m of matches) {
      const abs = resolve(sandbox.root, m);
      if (abs === sandbox.root || abs.startsWith(sandbox.root + sep)) {
        safe.push(relative(sandbox.root, abs).split(sep).join("/"));
      }
    }
    return {
      ok: true,
      output: safe.join("\n"),
      meta: { matches: safe },
    };
  } catch (err) {
    return {
      ok: false,
      output: `glob failed: ${errMsg(err)}`,
      error: errMsg(err),
    };
  }
}

// ---------------------------------------------------------------------------
// Grep

function toolGrep(
  pattern: string,
  options: Record<string, unknown>,
  sandbox: Sandbox,
): ToolResult {
  if (!pattern) {
    return { ok: false, output: "empty pattern", error: "bad input" };
  }
  let re: RegExp;
  try {
    const flags = typeof options["-i"] === "boolean" && options["-i"] ? "i" : "";
    re = new RegExp(pattern, flags);
  } catch (err) {
    return {
      ok: false,
      output: `invalid regex: ${errMsg(err)}`,
      error: errMsg(err),
    };
  }

  const glob = typeof options.glob === "string" ? options.glob : "**/*";
  const path = typeof options.path === "string" ? options.path : ".";

  const searchRootRel = path;
  const searchRoot = resolveInside(sandbox.root, searchRootRel);
  if (searchRoot === null) {
    return escapeError(searchRootRel);
  }

  let candidates: string[];
  try {
    candidates = globSync(glob, { cwd: searchRoot });
  } catch (err) {
    return {
      ok: false,
      output: `glob failed: ${errMsg(err)}`,
      error: errMsg(err),
    };
  }

  const lines: string[] = [];
  let matchCount = 0;
  for (const m of candidates) {
    const abs = resolve(searchRoot, m);
    if (!(abs === sandbox.root || abs.startsWith(sandbox.root + sep))) continue;
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (!st.isFile()) continue;
    let body: string;
    try {
      body = readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const fileRel = relative(sandbox.root, abs).split(sep).join("/");
    const fileLines = body.split(/\r?\n/);
    for (let i = 0; i < fileLines.length; i++) {
      if (re.test(fileLines[i])) {
        lines.push(`${fileRel}:${i + 1}:${fileLines[i]}`);
        matchCount++;
      }
    }
  }
  return {
    ok: true,
    output: lines.join("\n"),
    meta: { matchCount, matches: lines },
  };
}

// ---------------------------------------------------------------------------
// Bash (allowlist)

function toolBash(command: string, sandbox: Sandbox): ToolResult {
  const trimmed = command.trim();
  if (!trimmed) {
    return {
      ok: false,
      output: "empty command",
      error: "bad input",
    };
  }
  // No shell metacharacters allowed — keeps "cat foo.txt && rm -rf /" out.
  if (/[;&|`$<>(){}\\]/.test(trimmed)) {
    return {
      ok: false,
      output: "blocked by sandbox: command contains shell metacharacters",
      error: "blocked",
    };
  }
  const argv = trimmed.split(/\s+/);
  const head = argv[0];
  const rest = argv.slice(1);
  const predicate = BASH_ALLOWLIST[head];
  if (!predicate || !predicate(rest)) {
    return {
      ok: false,
      output: "blocked by sandbox: command not on allowlist",
      error: "blocked",
    };
  }
  try {
    const stdout = execFileSync(head, rest, {
      cwd: sandbox.root,
      timeout: BASH_TIMEOUT_MS,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024,
    });
    return {
      ok: true,
      output: stdout,
      meta: { code: 0 },
    };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number | null;
    };
    const stderr =
      e.stderr == null
        ? ""
        : typeof e.stderr === "string"
          ? e.stderr
          : e.stderr.toString("utf8");
    const stdout =
      e.stdout == null
        ? ""
        : typeof e.stdout === "string"
          ? e.stdout
          : e.stdout.toString("utf8");
    return {
      ok: false,
      output: stdout + stderr,
      error: e.message ?? "command failed",
      meta: { code: e.status ?? 1, stderr, stdout },
    };
  }
}

// ---------------------------------------------------------------------------
// helpers

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === undefined || v === null) return "";
  return String(v);
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Resolve `relPath` against `root`. Returns `null` if the result escapes the
 * sandbox or if `relPath` is absolute.
 */
function resolveInside(root: string, relPath: string): string | null {
  if (!relPath) return null;
  if (isAbsolute(relPath)) {
    // Allow if the absolute path already lives inside the sandbox; otherwise
    // reject. This means a model can pass either the relative or absolute
    // form of a file we already created.
    const abs = resolve(relPath);
    if (abs === root || abs.startsWith(root + sep)) return abs;
    return null;
  }
  const resolved = resolve(root, relPath);
  if (resolved === root || resolved.startsWith(root + sep)) return resolved;
  return null;
}

function escapeError(p: string): ToolResult {
  return {
    ok: false,
    output: `path escapes sandbox: ${JSON.stringify(p)}`,
    error: "path escape",
  };
}

function relativeOrSelf(root: string, abs: string): string {
  const rel = relative(root, abs);
  return rel === "" ? "." : rel.split(sep).join("/");
}

