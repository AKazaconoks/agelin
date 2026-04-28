/**
 * Assertion evaluator for golden tasks.
 *
 * Each TaskAssertion variant from types.ts is implemented here. The result
 * shape mirrors a tiny test framework: { passed, reason? } where `reason`
 * describes the failure (and is left undefined on success).
 *
 * Pure / synchronous / no I/O: this file is safe to call from anywhere.
 */

import type { RunResult, TaskAssertion } from "../types.js";

export interface AssertionVerdict {
  passed: boolean;
  reason?: string;
}

export function evaluate(
  assertion: TaskAssertion,
  result: RunResult,
): AssertionVerdict {
  switch (assertion.kind) {
    case "contains":
      return evalContains(assertion, result);
    case "regex":
      return evalRegex(assertion, result);
    case "json-path":
      return evalJsonPath(assertion, result);
    case "tool-called":
      return evalToolCalled(assertion, result);
    case "no-tool-called":
      return evalNoToolCalled(assertion, result);
    case "any-of":
      return evalAnyOf(assertion, result);
    case "all-of":
      return evalAllOf(assertion, result);
    default: {
      // Exhaustiveness guard: if a new assertion kind is added to types.ts
      // and this switch isn't updated, TS will catch it via `never`.
      const _exhaustive: never = assertion;
      void _exhaustive;
      return { passed: false, reason: "unknown assertion kind" };
    }
  }
}

// ---------------------------------------------------------------------------

function evalContains(
  a: Extract<TaskAssertion, { kind: "contains" }>,
  result: RunResult,
): AssertionVerdict {
  const haystack = a.caseSensitive ? result.output : result.output.toLowerCase();
  const needle = a.caseSensitive ? a.needle : a.needle.toLowerCase();
  if (haystack.includes(needle)) return { passed: true };
  return {
    passed: false,
    reason: `output did not contain ${JSON.stringify(a.needle)}`,
  };
}

function evalRegex(
  a: Extract<TaskAssertion, { kind: "regex" }>,
  result: RunResult,
): AssertionVerdict {
  let re: RegExp;
  try {
    re = new RegExp(a.pattern, a.flags);
  } catch (err) {
    return {
      passed: false,
      reason: `invalid regex /${a.pattern}/${a.flags ?? ""}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  if (re.test(result.output)) return { passed: true };
  return {
    passed: false,
    reason: `output did not match /${a.pattern}/${a.flags ?? ""}`,
  };
}

function evalJsonPath(
  a: Extract<TaskAssertion, { kind: "json-path" }>,
  result: RunResult,
): AssertionVerdict {
  const json = extractJson(result.output);
  if (json === undefined) {
    return {
      passed: false,
      reason: "no JSON object/array found in output",
    };
  }
  const actual = walkPath(json, a.path);
  if (deepEqual(actual, a.equals)) return { passed: true };
  return {
    passed: false,
    reason: `json path "${a.path}" was ${JSON.stringify(
      actual,
    )}, expected ${JSON.stringify(a.equals)}`,
  };
}

function evalToolCalled(
  a: Extract<TaskAssertion, { kind: "tool-called" }>,
  result: RunResult,
): AssertionVerdict {
  if (result.toolCalls.some((t) => t.tool === a.tool && t.count > 0)) {
    return { passed: true };
  }
  return { passed: false, reason: `tool "${a.tool}" was never called` };
}

function evalNoToolCalled(
  a: Extract<TaskAssertion, { kind: "no-tool-called" }>,
  result: RunResult,
): AssertionVerdict {
  const hit = result.toolCalls.find((t) => t.tool === a.tool && t.count > 0);
  if (!hit) return { passed: true };
  return {
    passed: false,
    reason: `tool "${a.tool}" was called ${hit.count} time(s), expected 0`,
  };
}

function evalAnyOf(
  a: Extract<TaskAssertion, { kind: "any-of" }>,
  result: RunResult,
): AssertionVerdict {
  const reasons: string[] = [];
  for (const inner of a.assertions) {
    const v = evaluate(inner, result);
    if (v.passed) return { passed: true };
    if (v.reason) reasons.push(v.reason);
  }
  return {
    passed: false,
    reason: `none of the any-of branches passed: ${reasons.join(" | ")}`,
  };
}

function evalAllOf(
  a: Extract<TaskAssertion, { kind: "all-of" }>,
  result: RunResult,
): AssertionVerdict {
  for (const inner of a.assertions) {
    const v = evaluate(inner, result);
    if (!v.passed) {
      return {
        passed: false,
        reason: `all-of branch failed: ${v.reason ?? "(no reason)"}`,
      };
    }
  }
  return { passed: true };
}

// ---------------------------------------------------------------------------
// helpers

/**
 * Best-effort JSON extraction from a model's free-form output.
 * Tries the whole string first, then ```json fenced blocks, then any
 * balanced {...} or [...] substring.
 */
function extractJson(text: string): unknown | undefined {
  const trimmed = text.trim();
  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  // Fenced ```json ... ``` blocks.
  const fencedRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = fencedRe.exec(text)) !== null) {
    const v = tryParse(m[1].trim());
    if (v !== undefined) return v;
  }

  // First balanced object / array substring.
  for (const open of ["{", "["] as const) {
    const close = open === "{" ? "}" : "]";
    const start = text.indexOf(open);
    if (start === -1) continue;
    let depth = 0;
    let inStr = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (inStr) {
        if (escape) escape = false;
        else if (c === "\\") escape = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          const v = tryParse(candidate);
          if (v !== undefined) return v;
          break;
        }
      }
    }
  }
  return undefined;
}

function tryParse(s: string): unknown | undefined {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/**
 * Walk a dot-separated path through an object. Numeric segments index into
 * arrays. Returns undefined if any segment is missing.
 */
function walkPath(root: unknown, path: string): unknown {
  if (path === "" || path === ".") return root;
  const parts = path.split(".").filter((p) => p.length > 0);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(part);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (Array.isArray(b)) return false;
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const aKeys = Object.keys(ao);
  const bKeys = Object.keys(bo);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bo, k)) return false;
    if (!deepEqual(ao[k], bo[k])) return false;
  }
  return true;
}
