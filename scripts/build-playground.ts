/**
 * Bundle the browser playground.
 *
 * Reads `src/playground/entry.ts`, drags in everything it transitively
 * imports (parser, all 34 rules, scoring, the markdown tokenizer), and
 * outputs a single ESM module at `site/playground.bundle.js`. The
 * playground page (`site/playground.html`) imports it as
 * `<script type="module" src="./playground.bundle.js">`.
 *
 * Run:
 *   npm run playground:build
 *
 * The bundle is regenerated on every release (so it carries the same
 * rule set as the published CLI). It's checked into git on `main` so
 * the GitHub Pages deploy is a static-files copy with no Node runtime.
 */

import { rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENTRY = resolve(ROOT, "src/playground/entry.ts");
const OUT_DIR = resolve(ROOT, "site");
const OUT_FILE = "playground.bundle.js";

// Bun's bundler ignores `--outfile`, so we let it write `entry.js`
// then rename. (Workaround for https://github.com/oven-sh/bun/issues/...
// — switch to a single API call once Bun.build supports custom names.)
const tempName = "entry.js";

const result = await Bun.build({
  entrypoints: [ENTRY],
  outdir: OUT_DIR,
  target: "browser",
  format: "esm",
  minify: true,
  // sourcemap: keep off for now to halve the on-disk footprint. Re-enable
  // when we have user-reported bugs in the playground that need source
  // mapping.
  sourcemap: "none",
});

if (!result.success) {
  console.error("playground bundle failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Rename entry.js -> playground.bundle.js; remove the temp.
const fs = await import("node:fs/promises");
const src = resolve(OUT_DIR, tempName);
const dst = resolve(OUT_DIR, OUT_FILE);
try {
  rmSync(dst, { force: true });
} catch {
  // ignore
}
await fs.rename(src, dst);

const stats = await fs.stat(dst);
const kb = (stats.size / 1024).toFixed(1);
console.log(`Wrote ${dst} — ${kb} KB`);
