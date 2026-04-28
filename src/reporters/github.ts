/**
 * GitHub Actions workflow-command reporter.
 *
 * Emits one `::error::`, `::warning::`, or `::notice::` line per issue
 * in the format documented at
 * https://docs.github.com/en/actions/learn-github-actions/workflow-commands-for-github-actions
 * GitHub Actions parses these to native PR-review annotations: red/yellow/blue
 * inline markers on the diff that point at the offending line. Way better UX
 * than a sticky comment.
 *
 * Mapping:
 *   agelin error      -> ::error::
 *   agelin warning    -> ::warning::
 *   agelin suggestion -> ::notice::
 *
 * Paths are made repo-relative against `process.cwd()` so the annotation
 * lands on the right line in the PR. Issues without a line number are
 * still emitted but without `line=` — GitHub anchors them to the file.
 *
 * Wire-up:
 *
 *   - name: Lint subagents
 *     run: npx agelin check ./.claude/agents/ --format=github
 *
 * That's it — no extra plumbing needed.
 */

import { relative } from "node:path";
import type { Issue, ReportContext, Reporter } from "../types.js";

/** GitHub workflow-command property values must escape `%`, `\r`, `\n`,
 *  `,`, `:`. The message body has its own encoding (just `%`, `\r`, `\n`).
 *  Spec: https://docs.github.com/en/actions/learn-github-actions/workflow-commands-for-github-actions#example-of-a-warning-command
 */
function encodeProperty(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A")
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}

function encodeMessage(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function severityCommand(severity: Issue["severity"]): "error" | "warning" | "notice" {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "suggestion":
      return "notice";
  }
}

function relativePath(absPath: string): string {
  // GitHub annotations resolve against the repo checkout root, which the
  // workflow's CWD is by default. Compute relative to cwd; fall back to
  // the absolute path if relative would escape (`..`).
  const rel = relative(process.cwd(), absPath);
  if (rel.startsWith("..") || rel === "") return absPath;
  // Annotations expect forward slashes even on Windows runners.
  return rel.replace(/\\/g, "/");
}

const githubReporter: Reporter = {
  name: "github",
  render(ctx: ReportContext): string {
    const lines: string[] = [];
    for (const result of ctx.results) {
      const file = relativePath(result.agentPath);
      for (const issue of result.staticIssues) {
        const cmd = severityCommand(issue.severity);
        const props: string[] = [`file=${encodeProperty(file)}`];
        if (typeof issue.line === "number") {
          props.push(`line=${issue.line}`);
        }
        // Title is the rule id — GitHub renders it bold above the message.
        props.push(`title=${encodeProperty(`agelin: ${issue.ruleId}`)}`);
        // Use real newlines and let encodeMessage convert; never insert
        // pre-encoded `%0A` because the encoder will double-escape it.
        const body = issue.fix
          ? `${issue.message}\n\nFix: ${issue.fix}`
          : issue.message;
        lines.push(`::${cmd} ${props.join(",")}::${encodeMessage(body)}`);
      }
    }
    return lines.join("\n");
  },
};

export default githubReporter;
