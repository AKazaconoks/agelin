/**
 * Inline disable-comment tests.
 *
 * Three directive shapes:
 *   <!-- agelin-disable-next-line [rule-ids] -->  (one line; lone if no ids)
 *   <!-- agelin-disable [rule-ids] -->            (block; until matching enable / EOF)
 *   <!-- agelin-enable [rule-ids] -->             (closes a block)
 *
 * Comma- or space-separated rule-id lists are accepted. No id list means
 * "all rules". Plugin-namespaced ids work the same way as built-in ids.
 *
 * These tests cover the directive parser (collectSuppressions) and the
 * matcher (isSuppressed) in isolation. End-to-end behaviour through the
 * full rule runner is exercised in the smoke tests below.
 */

import { describe, expect, test } from "bun:test";
import {
  collectSuppressions,
  isSuppressed,
  type Suppression,
} from "../src/suppressions.js";
import type { Issue } from "../src/types.js";

function makeIssue(ruleId: string, line?: number): Issue {
  return { ruleId, severity: "warning", message: "msg", line };
}

describe("collectSuppressions — directive parsing", () => {
  test("returns [] for empty body", () => {
    expect(collectSuppressions("")).toEqual([]);
  });

  test("returns [] when no directives are present", () => {
    expect(collectSuppressions("hello world\nno directives here")).toEqual([]);
  });

  test("disable-next-line targets the immediately following line", () => {
    const body = [
      "first line",
      "<!-- agelin-disable-next-line no-foo -->",
      "this line is suppressed",
    ].join("\n");
    const out = collectSuppressions(body);
    expect(out).toEqual([{ ruleId: "no-foo", fromLine: 3, toLine: 3 }]);
  });

  test("disable-next-line with no ids defaults to all rules", () => {
    const body = [
      "<!-- agelin-disable-next-line -->",
      "anything goes here",
    ].join("\n");
    const out = collectSuppressions(body);
    expect(out).toEqual([{ ruleId: "*", fromLine: 2, toLine: 2 }]);
  });

  test("disable-next-line accepts comma-separated rule list", () => {
    const body = [
      "<!-- agelin-disable-next-line rule-a, rule-b -->",
      "target",
    ].join("\n");
    const out = collectSuppressions(body);
    expect(out.map((s) => s.ruleId).sort()).toEqual(["rule-a", "rule-b"]);
    for (const s of out) {
      expect(s.fromLine).toBe(2);
      expect(s.toLine).toBe(2);
    }
  });

  test("paired disable / enable produces a closed range", () => {
    const body = [
      "line 1",
      "<!-- agelin-disable rule-a -->",
      "line 3",
      "line 4",
      "<!-- agelin-enable rule-a -->",
      "line 6",
    ].join("\n");
    const out = collectSuppressions(body);
    expect(out).toEqual([{ ruleId: "rule-a", fromLine: 2, toLine: 4 }]);
  });

  test("disable without enable runs to EOF", () => {
    const body = [
      "line 1",
      "<!-- agelin-disable rule-a -->",
      "line 3",
      "line 4",
    ].join("\n");
    const out = collectSuppressions(body);
    expect(out.length).toBe(1);
    expect(out[0]!.ruleId).toBe("rule-a");
    expect(out[0]!.fromLine).toBe(2);
    expect(out[0]!.toLine).toBe(Number.POSITIVE_INFINITY);
  });

  test("enable without ids closes every open block", () => {
    const body = [
      "<!-- agelin-disable rule-a -->",
      "<!-- agelin-disable rule-b -->",
      "line 3",
      "<!-- agelin-enable -->",
      "line 5",
    ].join("\n");
    const out = collectSuppressions(body);
    expect(out.length).toBe(2);
    for (const s of out) {
      expect(s.toLine).toBe(3);
    }
  });

  test("plugin-namespaced ids work the same as bare ids", () => {
    const body = [
      "<!-- agelin-disable-next-line my-org/no-foo -->",
      "target",
    ].join("\n");
    const out = collectSuppressions(body);
    expect(out).toEqual([
      { ruleId: "my-org/no-foo", fromLine: 2, toLine: 2 },
    ]);
  });

  test("CRLF line endings are normalized", () => {
    const body = [
      "line 1\r",
      "<!-- agelin-disable-next-line foo -->\r",
      "target\r",
    ].join("\n");
    const out = collectSuppressions(body);
    expect(out).toEqual([{ ruleId: "foo", fromLine: 3, toLine: 3 }]);
  });
});

describe("isSuppressed — matcher", () => {
  const sups: Suppression[] = [
    { ruleId: "rule-a", fromLine: 5, toLine: 7 },
    { ruleId: "*", fromLine: 10, toLine: 12 },
  ];

  test("returns false when there are no suppressions", () => {
    expect(isSuppressed(makeIssue("rule-a", 5), [])).toBe(false);
  });

  test("matches a specific rule on the right line", () => {
    expect(isSuppressed(makeIssue("rule-a", 5), sups)).toBe(true);
    expect(isSuppressed(makeIssue("rule-a", 7), sups)).toBe(true);
  });

  test("does not match a different rule even on the right line", () => {
    expect(isSuppressed(makeIssue("rule-b", 6), sups)).toBe(false);
  });

  test('"*" suppression matches any rule in its range', () => {
    expect(isSuppressed(makeIssue("rule-a", 11), sups)).toBe(true);
    expect(isSuppressed(makeIssue("rule-z", 12), sups)).toBe(true);
  });

  test("does not match outside the range", () => {
    expect(isSuppressed(makeIssue("rule-a", 4), sups)).toBe(false);
    expect(isSuppressed(makeIssue("rule-a", 8), sups)).toBe(false);
  });

  test("issue without a line is suppressed by any block disable that names it", () => {
    // A multi-line block disable suppresses no-line issues regardless
    // of where in the file it appears — these issues are whole-agent
    // (no-examples, prompt-too-short, etc.) and the user clearly meant
    // to silence them.
    expect(
      isSuppressed(makeIssue("rule-a"), [
        { ruleId: "rule-a", fromLine: 5, toLine: 7 },
      ]),
    ).toBe(true);
    // An open-ended block (running to EOF) also suppresses.
    expect(
      isSuppressed(makeIssue("rule-a"), [
        { ruleId: "rule-a", fromLine: 5, toLine: Number.POSITIVE_INFINITY },
      ]),
    ).toBe(true);
  });

  test("issue without a line is NOT suppressed by a disable-next-line directive", () => {
    // disable-next-line is single-line; "next line" is meaningless for
    // a whole-agent issue. Don't accidentally swallow it.
    expect(
      isSuppressed(makeIssue("rule-a"), [
        { ruleId: "rule-a", fromLine: 5, toLine: 5 },
      ]),
    ).toBe(false);
  });
});

describe("end-to-end through runRulesOnAgent", () => {
  // Importing here so the parser-suppression module isn't pulled in at
  // file load time when only the unit tests above run.
  test("disable-next-line silences the targeted rule on the next line", async () => {
    const { runRulesOnAgent } = await import("../src/lint-runner.js");
    const subagent = {
      path: "x.md",
      raw: "",
      frontmatter: { name: "x", description: "x" },
      // The fake rule below emits an issue with line=2. The directive
      // on line 1 should suppress it.
      body: [
        "<!-- agelin-disable-next-line dummy -->",
        "target line",
      ].join("\n"),
      bodyTokens: 0,
      parseErrors: [],
    };
    const dummyRule = {
      id: "dummy",
      defaultSeverity: "warning" as const,
      description: "always fires on line 2",
      check: () => [
        {
          ruleId: "dummy",
          severity: "warning" as const,
          message: "fires",
          line: 2,
        },
      ],
    };
    const issues = runRulesOnAgent(subagent, [dummyRule], { include: [] });
    expect(issues.length).toBe(0);
  });

  test("disable-next-line for a different rule does NOT silence", async () => {
    const { runRulesOnAgent } = await import("../src/lint-runner.js");
    const subagent = {
      path: "x.md",
      raw: "",
      frontmatter: { name: "x", description: "x" },
      body: [
        "<!-- agelin-disable-next-line some-other-rule -->",
        "target line",
      ].join("\n"),
      bodyTokens: 0,
      parseErrors: [],
    };
    const dummyRule = {
      id: "dummy",
      defaultSeverity: "warning" as const,
      description: "always fires on line 2",
      check: () => [
        {
          ruleId: "dummy",
          severity: "warning" as const,
          message: "fires",
          line: 2,
        },
      ],
    };
    const issues = runRulesOnAgent(subagent, [dummyRule], { include: [] });
    expect(issues.length).toBe(1);
  });
});
