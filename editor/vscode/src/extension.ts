/**
 * agelin — VS Code extension entry point.
 *
 * Lifecycle:
 *   - On activation we register one VS Code DiagnosticCollection.
 *   - When a document is opened, edited, or saved, we lint it (in
 *     memory — `parseSubagentFromString`, no spawn, no fs read) and
 *     publish the resulting diagnostics for that uri.
 *   - When a document is closed, we clear its diagnostics so the
 *     Problems pane stays accurate.
 *
 * The extension is intentionally feature-light at v0.1.0:
 *   - No code actions yet (auto-fix lives in the CLI; we'll add
 *     "Apply agelin fix" once the CLI's fix path covers more rules).
 *   - No status-bar score widget yet.
 *   - No LSP server — direct API calls suffice for the file sizes
 *     subagents typically run (under 10 KB).
 *
 * Performance: a typical subagent (~5 KB) lints in <5 ms; we don't
 * even debounce. If we see slowdowns on huge files we'll reconsider.
 */

import * as vscode from "vscode";
import { isSupportedDocument, lintDocument } from "./lint.js";

export function activate(context: vscode.ExtensionContext): void {
  const diag = vscode.languages.createDiagnosticCollection("agelin");
  context.subscriptions.push(diag);

  // Lint anything already open at activation time.
  for (const editor of vscode.window.visibleTextEditors) {
    refresh(editor.document, diag);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => refresh(doc, diag)),
    vscode.workspace.onDidChangeTextDocument((e) => refresh(e.document, diag)),
    vscode.workspace.onDidSaveTextDocument((doc) => refresh(doc, diag)),
    vscode.workspace.onDidCloseTextDocument((doc) => diag.delete(doc.uri)),
  );

  // React to config changes — the user might toggle `agelin.enable` or
  // change `agelin.glob` while a file is open. Re-lint everything visible
  // so the new setting takes effect immediately.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("agelin")) return;
      diag.clear();
      for (const editor of vscode.window.visibleTextEditors) {
        refresh(editor.document, diag);
      }
    }),
  );
}

export function deactivate(): void {
  // Nothing to clean up — DiagnosticCollection is owned by the
  // extension context and disposed automatically.
}

function refresh(
  doc: vscode.TextDocument,
  diag: vscode.DiagnosticCollection,
): void {
  const cfg = vscode.workspace.getConfiguration("agelin");
  const enabled = cfg.get<boolean>("enable", true);
  if (!enabled || !isSupportedDocument(doc)) {
    diag.delete(doc.uri);
    return;
  }
  // `lintDocument` is async because it dynamically imports the ESM
  // `agelin` package. Fire-and-forget here — the resulting promise
  // settles in microseconds after the first activation, and we don't
  // want to make every event handler async/await.
  lintDocument(doc).then(
    (diagnostics) => {
      diag.set(doc.uri, diagnostics);
    },
    (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      diag.set(doc.uri, [
        new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 0),
          `agelin: lint failed (${msg}). File a bug at github.com/AKazaconoks/agelin/issues with this document attached.`,
          vscode.DiagnosticSeverity.Error,
        ),
      ]);
    },
  );
}
