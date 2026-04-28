/**
 * SARIF v2.1.0 reporter tests.
 *
 * The full schema lives at
 * https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html .
 * We don't validate against the published JSON Schema (would require a
 * 1MB schema file as a dep); instead we lock in the shape with shape-
 * specific assertions covering everything GitHub Code Scanning's
 * intake expects.
 */

import { describe, expect, test } from "bun:test";
import sarifReporter from "../src/reporters/sarif.js";
import { ALL_RULES } from "../src/rules/index.js";
import type { AgentScore, ReportContext } from "../src/types.js";

function ctx(results: AgentScore[]): ReportContext {
  return {
    results,
    generatedAt: "2026-04-28T00:00:00Z",
    toolVersion: "test",
  };
}

function mkScore(opts: Partial<AgentScore> & { agentPath: string }): AgentScore {
  return {
    agentName: "test",
    score: 50,
    components: { staticHealth: 50, successRate: 0, costEfficiency: 0, consistency: 0 },
    staticIssues: [],
    ...opts,
  };
}

describe("sarif reporter", () => {
  test("emits a valid SARIF 2.1.0 envelope", () => {
    const out = sarifReporter.render(ctx([]));
    const parsed = JSON.parse(out);
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.$schema).toMatch(/sarif-schema-2\.1\.0\.json$/);
    expect(Array.isArray(parsed.runs)).toBe(true);
    expect(parsed.runs.length).toBe(1);
  });

  test("declares every rule from ALL_RULES under tool.driver.rules[]", () => {
    const parsed = JSON.parse(sarifReporter.render(ctx([])));
    const rules = parsed.runs[0].tool.driver.rules;
    expect(rules.length).toBe(ALL_RULES.length);
    const ids = new Set(rules.map((r: { id: string }) => r.id));
    for (const r of ALL_RULES) expect(ids.has(r.id)).toBe(true);
    // Each rule has the fields GitHub Code Scanning surfaces in its UI.
    for (const r of rules) {
      expect(typeof r.shortDescription.text).toBe("string");
      expect(typeof r.fullDescription.text).toBe("string");
      expect(["error", "warning", "note"]).toContain(
        r.defaultConfiguration.level,
      );
    }
  });

  test("maps severities: error -> error, warning -> warning, suggestion -> note", () => {
    const out = sarifReporter.render(
      ctx([
        mkScore({
          agentPath: process.cwd() + "/.claude/agents/x.md",
          staticIssues: [
            { ruleId: "r1", severity: "error", message: "boom" },
            { ruleId: "r2", severity: "warning", message: "watch" },
            { ruleId: "r3", severity: "suggestion", message: "nudge" },
          ],
        }),
      ]),
    );
    const results = JSON.parse(out).runs[0].results;
    expect(results[0].level).toBe("error");
    expect(results[1].level).toBe("warning");
    expect(results[2].level).toBe("note");
  });

  test("locations.region.startLine present when issue has line, omitted otherwise", () => {
    const out = sarifReporter.render(
      ctx([
        mkScore({
          agentPath: process.cwd() + "/x.md",
          staticIssues: [
            { ruleId: "r", severity: "warning", message: "m", line: 42 },
            { ruleId: "r", severity: "warning", message: "m" },
          ],
        }),
      ]),
    );
    const results = JSON.parse(out).runs[0].results;
    expect(results[0].locations[0].physicalLocation.region.startLine).toBe(42);
    expect(results[1].locations[0].physicalLocation.region).toBeUndefined();
  });

  test("appends fix-it text to the result message when present", () => {
    const out = sarifReporter.render(
      ctx([
        mkScore({
          agentPath: process.cwd() + "/x.md",
          staticIssues: [
            {
              ruleId: "r",
              severity: "warning",
              message: "primary",
              fix: "do this",
            },
          ],
        }),
      ]),
    );
    const result = JSON.parse(out).runs[0].results[0];
    expect(result.message.text).toContain("primary");
    expect(result.message.text).toContain("Fix: do this");
  });

  test("artifactLocation.uri is repo-relative with forward slashes", () => {
    const out = sarifReporter.render(
      ctx([
        mkScore({
          // A path under cwd so `relative()` doesn't return `..`.
          agentPath: process.cwd() + "/.claude/agents/x.md",
          staticIssues: [{ ruleId: "r", severity: "warning", message: "m" }],
        }),
      ]),
    );
    const uri =
      JSON.parse(out).runs[0].results[0].locations[0].physicalLocation
        .artifactLocation.uri;
    expect(uri).toBe(".claude/agents/x.md");
    expect(uri).not.toContain("\\");
  });

  test("partialFingerprints are stable across re-runs", () => {
    // Same input → same fingerprint → GitHub dedupes the alert.
    const score = mkScore({
      agentPath: process.cwd() + "/x.md",
      staticIssues: [
        { ruleId: "r", severity: "warning", message: "anything", line: 7 },
      ],
    });
    const out1 = JSON.parse(sarifReporter.render(ctx([score])));
    const out2 = JSON.parse(sarifReporter.render(ctx([score])));
    const fp1 = out1.runs[0].results[0].partialFingerprints.agelin;
    const fp2 = out2.runs[0].results[0].partialFingerprints.agelin;
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[0-9a-f]+$/);
  });

  test("partialFingerprints differ for different (rule, file, line) tuples", () => {
    const out = JSON.parse(
      sarifReporter.render(
        ctx([
          mkScore({
            agentPath: process.cwd() + "/x.md",
            staticIssues: [
              { ruleId: "r", severity: "warning", message: "a", line: 1 },
              { ruleId: "r", severity: "warning", message: "a", line: 2 },
              { ruleId: "s", severity: "warning", message: "a", line: 1 },
            ],
          }),
        ]),
      ),
    );
    const fps = (out.runs[0].results as Array<{
      partialFingerprints: { agelin: string };
    }>).map((r) => r.partialFingerprints.agelin);
    const unique = new Set(fps);
    expect(unique.size).toBe(3);
  });
});
