/**
 * SARIF v2.1.0 reporter.
 *
 * Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html
 * GitHub Code Scanning intake: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning
 *
 * Outputs a single SARIF JSON document that:
 *   - Declares `agelin` as the analysis tool with its version
 *   - Lists every rule in `ALL_RULES` under `tool.driver.rules[]` so the
 *     consumer (GitHub / Sonar) knows about rules even before any of
 *     them fires. Helps when you later deprecate or rename a rule.
 *   - Emits one result per issue with severity mapped to SARIF's
 *     `error` / `warning` / `note` levels (`note` covers our `suggestion`).
 *   - Uses `partialFingerprints` keyed on (rule id, agent path, line) so
 *     GitHub Code Scanning can dedupe alerts across re-runs.
 *
 * Wire-up:
 *
 *   - name: agelin
 *     run: npx agelin check ./.claude/agents/ --format=sarif > agelin.sarif
 *   - uses: github/codeql-action/upload-sarif@v3
 *     with:
 *       sarif_file: agelin.sarif
 *
 * The result lands in the repo's Security → Code scanning alerts tab.
 */

import { relative } from "node:path";
import { ALL_RULES } from "../rules/index.js";
import type { Issue, ReportContext, Reporter } from "../types.js";

const SARIF_SCHEMA =
  "https://docs.oasis-open.org/sarif/sarif/v2.1.0/cos02/schemas/sarif-schema-2.1.0.json";

const TOOL_INFORMATION_URI = "https://github.com/AKazaconoks/agelin";
const TOOL_NAME = "agelin";
// Updated at release time. Keep in sync with package.json + src/index.ts.
const TOOL_VERSION = "0.5.2";

interface SarifResult {
  ruleId: string;
  level: "error" | "warning" | "note";
  message: { text: string };
  locations: Array<{
    physicalLocation: {
      artifactLocation: { uri: string; uriBaseId: "%SRCROOT%" };
      region?: { startLine: number };
    };
  }>;
  partialFingerprints?: Record<string, string>;
}

function severityToLevel(severity: Issue["severity"]): "error" | "warning" | "note" {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "suggestion":
      return "note";
  }
}

function relativePath(absPath: string): string {
  const rel = relative(process.cwd(), absPath);
  if (rel.startsWith("..") || rel === "") return absPath;
  // SARIF artifactLocation.uri must use forward slashes (it's a URI).
  return rel.replace(/\\/g, "/");
}

function fingerprint(ruleId: string, file: string, line: number | undefined): string {
  // GitHub uses partialFingerprints to dedupe across runs. We hash the
  // (rule, file, line) tuple rather than the message text — message text
  // can change between agelin versions when we improve wording, and we
  // don't want users to see "new" alerts on every release.
  const key = `${ruleId}::${file}::${line ?? "noline"}`;
  // Stable, no native crypto required at this layer — a small djb2 is
  // good enough for fingerprint uniqueness in this scope.
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = (h * 33) ^ key.charCodeAt(i);
  }
  // `>>> 0` coerces to unsigned 32-bit, which is what we want for a
  // stable hex fingerprint. (`| 0` would turn it back to signed and
  // produce negative-looking strings.)
  return (h >>> 0).toString(16);
}

const sarifReporter: Reporter = {
  name: "sarif",
  render(ctx: ReportContext): string {
    const results: SarifResult[] = [];
    for (const score of ctx.results) {
      const file = relativePath(score.agentPath);
      for (const issue of score.staticIssues) {
        const region = issue.line !== undefined ? { startLine: issue.line } : undefined;
        const text = issue.fix
          ? `${issue.message}\n\nFix: ${issue.fix}`
          : issue.message;
        results.push({
          ruleId: issue.ruleId,
          level: severityToLevel(issue.severity),
          message: { text },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: file, uriBaseId: "%SRCROOT%" },
                ...(region ? { region } : {}),
              },
            },
          ],
          partialFingerprints: {
            agelin: fingerprint(issue.ruleId, file, issue.line),
          },
        });
      }
    }

    const sarif = {
      $schema: SARIF_SCHEMA,
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: TOOL_NAME,
              version: TOOL_VERSION,
              informationUri: TOOL_INFORMATION_URI,
              rules: ALL_RULES.map((rule) => ({
                id: rule.id,
                shortDescription: { text: rule.description },
                fullDescription: { text: rule.description },
                defaultConfiguration: {
                  level: severityToLevel(rule.defaultSeverity),
                },
              })),
            },
          },
          results,
          // SARIF allows tool-emitted artifacts list. We omit it; the
          // results' artifactLocation entries are sufficient and adding
          // a full artifact list would inflate the payload.
        },
      ],
    };

    // Pretty-print: improves diffability when SARIF output is committed
    // (some workflows check it in). Cost is small (~30% size).
    return JSON.stringify(sarif, null, 2);
  },
};

export default sarifReporter;
