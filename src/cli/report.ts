/**
 * `agelin report` — replay the most recent run through a reporter.
 *
 * Reads `.agelin/last-run.json`. If no run has been recorded the
 * command exits with a helpful message rather than a stack trace.
 */

import { loadLastRun } from "../persistence.js";
import { getReporter } from "../reporters/index.js";

export interface ReportOptions {
  format: string;
}

export async function runReport(opts: ReportOptions): Promise<void> {
  const ctx = loadLastRun();
  if (!ctx) {
    console.error(
      "No previous run found. Run `agelin check <path>` or `agelin bench <path>` first.",
    );
    process.exit(1);
  }

  const reporter = getReporter(opts.format);
  const output = reporter.render(ctx);
  console.log(output);
}
