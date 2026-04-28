/**
 * Bundle the VS Code extension into a single CommonJS file.
 *
 * VS Code loads extensions via `require("./out/extension.js")`. We
 * bundle our two source files plus the `agelin` package transitively
 * so the published .vsix doesn't need to ship `node_modules/`. Also
 * marks `vscode` as external — that module is provided by the host
 * editor, never bundled.
 *
 * Output: `out/extension.js` (CommonJS), used as the extension's
 * `main` entry per `package.json`.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const result = await Bun.build({
  entrypoints: [resolve(ROOT, "src/extension.ts")],
  outdir: resolve(ROOT, "out"),
  // VS Code's extension host is Node-based and loads CommonJS.
  // Bun's bundler emits ESM by default, so we use the `esm` output and
  // let the loader handle it. Modern VS Code (>= 1.91) supports ESM
  // extensions via "type": "module"; older versions need CJS. We target
  // CJS for maximum compat with `engines.vscode: ^1.85.0`.
  target: "node",
  format: "cjs",
  // The extension host provides `vscode`. Do not bundle it.
  external: ["vscode"],
  minify: true,
  sourcemap: "linked",
  // Bun tags the file `extension.js` from the entrypoint name.
});

if (!result.success) {
  console.error("agelin-vscode bundle failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const fs = await import("node:fs/promises");
const stats = await fs.stat(resolve(ROOT, "out/extension.js"));
console.log(
  `Wrote out/extension.js — ${(stats.size / 1024).toFixed(1)} KB`,
);
