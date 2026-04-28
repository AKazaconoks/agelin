/**
 * Bridges agelin's lint engine to VS Code's Diagnostics API.
 *
 * `isSupportedDocument` decides whether a given TextDocument should be
 * linted — only `.md` files in `markdown` language mode whose path
 * matches the user's `agelin.glob` setting. Default glob covers the
 * standard `.claude/agents/` layout.
 *
 * `lintDocument` parses the document text in memory, runs every rule,
 * and converts each Issue to a vscode.Diagnostic. We tag each
 * diagnostic with `source: "agelin"` so they're filterable in the
 * Problems pane.
 */

import * as vscode from "vscode";
// agelin is an ESM package; this extension is CJS (per VS Code's
// extension host requirements until VS Code 1.91+). At runtime our
// bundler inlines agelin into out/extension.js so this is a static
// inline anyway — but the type system needs help. The dynamic-import
// dance below resolves once at module load and caches the namespace
// for cheap subsequent calls.
type AgelinApi = typeof import("agelin", { with: { "resolution-mode": "import" } });
type Issue = import("agelin", { with: { "resolution-mode": "import" } }).Issue;

let agelinPromise: Promise<AgelinApi> | null = null;
function loadAgelin(): Promise<AgelinApi> {
  if (!agelinPromise) {
    agelinPromise = import("agelin");
  }
  return agelinPromise;
}

// Defaults baked into the extension when the user hasn't overridden
// `agelin.glob`. Mirrors the schema in package.json. The fallback is
// the source of truth — `cfg.get(...)`'s second arg only fires when the
// setting is unset, which is rarer than you'd think since VS Code
// fills in the contributed default.
const DEFAULT_GLOBS: string[] = [
  "**/.claude/agents/**/*.md",
  "**/*.agent.md",
];

/**
 * Runtime check: should we lint this document?
 *
 *   - Must be markdown (`languageId === "markdown"`).
 *   - Must be a real file on disk (we skip git diffs, output panels,
 *     untitled scratch buffers, etc.).
 *   - Must match ANY of the patterns in `agelin.glob`. The setting
 *     accepts either a single string (legacy) or an array of strings
 *     (preferred). Both shapes are normalised here so the rest of the
 *     extension never has to branch.
 */
export function isSupportedDocument(doc: vscode.TextDocument): boolean {
  if (doc.languageId !== "markdown") return false;
  if (doc.uri.scheme !== "file") return false;

  const cfg = vscode.workspace.getConfiguration("agelin");
  const raw = cfg.get<string | string[]>("glob");
  const patterns = normaliseGlobs(raw);
  if (patterns.length === 0) return false;

  // VS Code's `languages.match` returns a non-zero score on hit; we
  // OR across patterns so any match wins. The DocumentFilter `pattern`
  // field accepts either a glob string or a RelativePattern; a plain
  // string suffices here.
  for (const pattern of patterns) {
    const score = vscode.languages.match(
      { language: "markdown", scheme: "file", pattern },
      doc,
    );
    if (score > 0) return true;
  }
  return false;
}

function normaliseGlobs(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return DEFAULT_GLOBS;
  if (typeof raw === "string") return raw.length > 0 ? [raw] : [];
  if (Array.isArray(raw)) return raw.filter((p) => typeof p === "string" && p.length > 0);
  return DEFAULT_GLOBS;
}

export async function lintDocument(
  doc: vscode.TextDocument,
): Promise<vscode.Diagnostic[]> {
  const { ALL_RULES, parseSubagentFromString } = await loadAgelin();
  const text = doc.getText();
  const subagent = parseSubagentFromString(text, doc.uri.fsPath);

  const issues: Issue[] = [];

  // Surface YAML / structural parse errors as `parse-error` diagnostics
  // before any rule runs (those would all false-positive on broken YAML).
  for (const pe of subagent.parseErrors) {
    issues.push({
      ruleId: "parse-error",
      severity: "error",
      message: pe,
    });
  }

  for (const rule of ALL_RULES) {
    try {
      issues.push(...rule.check(subagent));
    } catch (err) {
      // Don't let a buggy rule kill the whole lint; surface a friendly
      // diagnostic and keep going.
      const msg = err instanceof Error ? err.message : String(err);
      issues.push({
        ruleId: rule.id,
        severity: "warning",
        message: `Rule ${rule.id} threw: ${msg}`,
      });
    }
  }

  return issues.map((issue) => toDiagnostic(issue, doc));
}

function toDiagnostic(
  issue: Issue,
  doc: vscode.TextDocument,
): vscode.Diagnostic {
  // VS Code lines are 0-indexed; agelin issues use 1-indexed line numbers.
  // Issues without a line attach to line 0 (the top of the file).
  const line0 = issue.line !== undefined ? Math.max(0, issue.line - 1) : 0;
  const lineRange = doc.lineAt(Math.min(line0, doc.lineCount - 1)).range;

  const messageParts = [issue.message];
  if (issue.fix) messageParts.push(`Fix: ${issue.fix}`);
  if (issue.docUrl) messageParts.push(`Docs: ${issue.docUrl}`);

  const d = new vscode.Diagnostic(
    lineRange,
    messageParts.join("\n\n"),
    severityFor(issue.severity),
  );
  d.source = "agelin";
  d.code = issue.ruleId;
  return d;
}

function severityFor(severity: Issue["severity"]): vscode.DiagnosticSeverity {
  switch (severity) {
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "suggestion":
      return vscode.DiagnosticSeverity.Information;
  }
}
