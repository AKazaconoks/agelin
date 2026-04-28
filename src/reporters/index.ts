/**
 * Reporter registry. Resolves a format name to a Reporter implementation.
 *
 * The "html" reporter is owned by Agent D — until that lands we expose a
 * stub that prints a "coming soon" notice rather than throwing, so the CLI
 * stays graceful.
 */

import type { Reporter } from "../types.js";
import consoleReporter from "./console.js";
import jsonReporter from "./json.js";
import markdownReporter from "./markdown.js";

const htmlStub: Reporter = {
  name: "html",
  render(): string {
    return "HTML reporter coming soon — pass --format=console, json, or markdown for now.";
  },
};

const REPORTERS: Record<string, Reporter> = {
  console: consoleReporter,
  json: jsonReporter,
  markdown: markdownReporter,
  html: htmlStub,
};

export function getReporter(name: string): Reporter {
  const reporter = REPORTERS[name];
  if (!reporter) {
    throw new Error(
      `Unknown format "${name}". Available: ${Object.keys(REPORTERS).join(", ")}`,
    );
  }
  return reporter;
}
