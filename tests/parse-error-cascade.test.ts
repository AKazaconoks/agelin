/**
 * Cascade-suppression test, isolated from `parse-error-explainer.test.ts`
 * because gray-matter's YAML parser carries state across failed parses
 * within a single process. See the comment in the sibling file for the
 * full story.
 *
 * Pre-0.2.2 a YAML failure produced TWO parse errors per agent: the
 * primary YAML error + a "missing or non-string `name`" cascade
 * because no `data` was extracted. The cascade was always redundant —
 * authors can't fix a missing name without first fixing the YAML.
 *
 * This file contains exactly one test so we get a fresh process state
 * for the parse failure under inspection.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseSubagent } from "../src/parser/parse.js";

describe("parse-error cascade-suppression", () => {
  test("when YAML fails, no cascading missing-name error is emitted", () => {
    const dir = mkdtempSync(join(tmpdir(), "agelin-cascade-"));
    const path = join(dir, "cascade.md");
    writeFileSync(
      path,
      `---
name: cascade-test
description: Use this agent when help is needed for something with examples.
  Examples:

  <example>
  Context: a user.
  user: "do thing"
  </example>
tools:
  - Read
---

Body.
`,
      "utf8",
    );

    const subagent = parseSubagent(path);

    // The friendly-hint YAML error must be there.
    expect(
      subagent.parseErrors.some((e) =>
        e.includes("frontmatter YAML failed to parse"),
      ),
    ).toBe(true);

    // The cascade error must NOT be there. Pre-0.2.2 it was; the parser
    // now skips secondary checks when YAML failed.
    expect(
      subagent.parseErrors.some((e) => e.includes("missing or non-string")),
    ).toBe(false);
  });
});
