#!/usr/bin/env node
/**
 * agelin CLI entry point. (Project formerly known as subagent-lint.)
 * Wires together: parser -> rules -> (eval) -> scoring -> reporters.
 */

import { parseArgs } from "node:util";
import { runCheck } from "./cli/check.js";
import { runBench } from "./cli/bench.js";
import { runReport } from "./cli/report.js";
import { runInit } from "./cli/init.js";
import { runBaseline } from "./cli/baseline.js";
import { runBadge } from "./cli/badge.js";
import { runDiff } from "./cli/diff.js";
import { runCache } from "./cli/cache.js";
import { runFix } from "./cli/fix.js";
import { printRules } from "./cli/rules.js";

const HELP = `
agelin — quality scorer & benchmark harness for Claude Code subagents

Usage:
  agelin <command> [options] [path]

Commands:
  check <path>       Run static rules only (fast, free)
  bench <path>       Run static + dynamic eval (requires ANTHROPIC_API_KEY)
  baseline           Sweep targets/ -> leaderboard.json + leaderboard.md
  badge              Emit a shields.io-compatible SVG badge to stdout
  diff <a> <b>       Compare two check/bench JSON outputs
  fix <path>         Auto-correct safe rule violations (writes in place; --dry-run to preview)
  cache <sub>        Cache mgmt: stats | clear [--older-than-days=N]
  report             Generate HTML report from last run
  init               Scaffold a agelin.config.json
  help               Show this message

Options:
  --format <fmt>     Output format: console|json|markdown   (default: console)
  --config <path>    Path to config file                    (default: ./agelin.config.json)
  --targets <dir>    Targets dir for baseline               (default: ./targets)
  --backend <name>   Eval backend: api|claude-code|auto     (default: auto)
  --model <id>       Override config.benchModel
  --repeats <n>      Override config.benchRepeats
  --fail-on <sev>    Exit non-zero on: error|warning|suggestion|none (check default: error)
  --quiet            Hide clean agents from console output  (check only)
  --verbose          Show full message + fix per issue       (check only;
                       auto-on for single-agent runs)
  --output <path>    bench: write report to file directly (avoids stdout buffer issues)
  --score <n>        Score 0-100 (badge)
  --agent <name>     Agent name (badge)
  --rules            List all available rules
  --template <name>  init: scaffold a starter agent (code-reviewer, test-runner, debug-helper)
  --dry-run          fix: preview changes without writing (default writes in place)
  --version

Examples:
  agelin check .claude/agents/
  agelin bench .claude/agents/ --format=json > results.json
  agelin baseline --targets=./targets
  agelin badge --score=87 --agent=python-pro > badge.svg
  agelin report
`.trim();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  if (command === "--version" || command === "-v") {
    console.log("0.4.1");
    process.exit(0);
  }

  // `--rules` may stand alone (`agelin --rules`) or follow a command
  // (`agelin check --rules`). When it stands alone, args[0] is the
  // flag itself and there is no command to strip from the parseArgs input.
  const hasCommand = !command.startsWith("--");

  const { values, positionals } = parseArgs({
    args: hasCommand ? args.slice(1) : args,
    options: {
      format: { type: "string", default: "console" },
      config: { type: "string" },
      rules: { type: "boolean", default: false },
      targets: { type: "string" },
      backend: { type: "string" },
      model: { type: "string" },
      repeats: { type: "string" },
      score: { type: "string" },
      agent: { type: "string" },
      "fail-on": { type: "string" },
      quiet: { type: "boolean", default: false },
      "older-than-days": { type: "string" },
      template: { type: "string" },
      output: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      verbose: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const failOn = parseFailOn(values["fail-on"]);

  if (values.rules === true) {
    printRules();
    process.exit(0);
  }

  const targetPath = positionals[0] ?? ".claude/agents/";

  switch (command) {
    case "check":
      await runCheck({
        path: targetPath,
        format: values.format!,
        configPath: values.config,
        failOn,
        quiet: values.quiet === true,
        // `--verbose` forces the per-issue layout; otherwise the
        // reporter auto-picks (verbose for single-agent runs).
        verbose: values.verbose === true ? true : undefined,
      });
      break;
    case "bench":
      await runBench({
        path: targetPath,
        format: values.format!,
        configPath: values.config,
        outputFile: values.output,
      });
      break;
    case "baseline":
      await runBaseline({
        targetsDir: values.targets ?? positionals[0],
        format: values.format!,
        configPath: values.config,
        backend: values.backend,
        model: values.model,
        repeats:
          values.repeats !== undefined ? Number.parseInt(values.repeats, 10) : undefined,
      });
      break;
    case "badge":
      if (values.score === undefined) {
        console.error("badge: --score=<0-100> is required");
        process.exit(1);
      }
      await runBadge({
        score: Number.parseFloat(values.score),
        agentName: values.agent,
        // Format defaults to "console" globally; badge only emits SVG, so map
        // the global default to svg unless the user explicitly asked otherwise.
        format: values.format && values.format !== "console" ? values.format : "svg",
      });
      break;
    case "diff": {
      const baselinePath = positionals[0];
      const currentPath = positionals[1];
      if (!baselinePath || !currentPath) {
        console.error("diff: requires two positional args (baseline and current JSON paths)");
        process.exit(2);
      }
      await runDiff({
        baselinePath,
        currentPath,
        format: values.format!,
        failOnRegress: failOn !== "none",
      });
      break;
    }
    case "fix": {
      const fixPath = positionals[0] ?? ".claude/agents/";
      // Default behavior: write in place. Use --dry-run to preview.
      const dryRun = process.argv.includes("--dry-run");
      await runFix({ path: fixPath, dryRun });
      break;
    }
    case "cache": {
      const sub = positionals[0] as "clear" | "stats" | "help" | undefined;
      const olderRaw = values["older-than-days"];
      const olderThanDays =
        typeof olderRaw === "string" ? Number.parseInt(olderRaw, 10) : undefined;
      await runCache({
        subcommand: sub === "clear" || sub === "stats" ? sub : "help",
        olderThanDays: Number.isFinite(olderThanDays) ? olderThanDays : undefined,
      });
      break;
    }
    case "report":
      await runReport({ format: values.format! });
      break;
    case "init":
      await runInit({ template: values.template });
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

/**
 * Normalize the --fail-on flag. Accepts: error | warning | suggestion | none.
 * Defaults to undefined (callers fall back to their own default — usually "error").
 */
function parseFailOn(
  raw: string | undefined,
): "error" | "warning" | "suggestion" | "none" | undefined {
  if (raw === undefined) return undefined;
  const v = raw.toLowerCase();
  if (v === "error" || v === "warning" || v === "suggestion" || v === "none") {
    return v;
  }
  console.error(
    `Invalid --fail-on value "${raw}". Expected: error | warning | suggestion | none.`,
  );
  process.exit(2);
}

main().catch((err) => {
  console.error("Fatal:", err instanceof Error ? err.message : err);
  process.exit(1);
});
