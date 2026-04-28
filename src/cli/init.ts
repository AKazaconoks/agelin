/**
 * `agelin init [--template=<name>]` — scaffold project files.
 *
 * Default mode (no template flag): writes `agelin.config.json`
 * with the package's defaults. Refuses to overwrite an existing config
 * to protect user customizations.
 *
 * With --template=<name>: copy a starter agent file into
 * `.claude/agents/<name>.md`. Available templates:
 *   code-reviewer, test-runner, debug-helper.
 */

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONFIG } from "../types.js";

const CONFIG_FILENAME = "agelin.config.json";

const KNOWN_TEMPLATES = new Set(["code-reviewer", "test-runner", "debug-helper"]);

export interface InitOptions {
  template?: string;
}

export async function runInit(opts: InitOptions = {}): Promise<void> {
  if (opts.template) {
    return scaffoldTemplate(opts.template);
  }
  return scaffoldConfig();
}

function scaffoldConfig(): void {
  const target = resolve(process.cwd(), CONFIG_FILENAME);

  if (existsSync(target)) {
    console.error(
      `${CONFIG_FILENAME} already exists at ${target}. Refusing to overwrite.`,
    );
    process.exit(1);
  }

  const body = JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n";
  writeFileSync(target, body, "utf8");
  console.log(`Created ${CONFIG_FILENAME}`);
}

function scaffoldTemplate(name: string): void {
  if (!KNOWN_TEMPLATES.has(name)) {
    console.error(
      `Unknown template "${name}". Available: ${[...KNOWN_TEMPLATES].join(", ")}.`,
    );
    process.exit(2);
  }

  // Resolve the template path relative to this module, so it works whether
  // installed via npm (templates/ shipped in package) or run from source.
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/cli/init.js -> dist/cli -> dist -> package root
  const candidates = [
    resolve(here, "..", "..", "..", "templates", `${name}.md`),
    resolve(here, "..", "..", "templates", `${name}.md`),
    resolve(here, "..", "templates", `${name}.md`),
    resolve(process.cwd(), "templates", `${name}.md`),
  ];
  const src = candidates.find((p) => existsSync(p));
  if (!src) {
    console.error(
      `Template "${name}" not found on disk. Install paths checked:\n${candidates.map((c) => "  " + c).join("\n")}`,
    );
    process.exit(1);
  }

  const targetDir = resolve(process.cwd(), ".claude", "agents");
  mkdirSync(targetDir, { recursive: true });
  const dst = join(targetDir, `${name}.md`);
  if (existsSync(dst)) {
    console.error(`${dst} already exists. Refusing to overwrite.`);
    process.exit(1);
  }
  copyFileSync(src, dst);
  console.log(`Created ${dst}`);
  console.log(`Run \`agelin check ${dst}\` to verify.`);
}
