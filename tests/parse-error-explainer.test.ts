/**
 * Tests for the parse-error friendly-message path (0.2.2).
 *
 * The wild-corpus audit found 14/97 popular agents fail YAML parsing,
 * almost all because of unquoted `<example>` tags inside `description:`.
 * The parser now:
 *   1. Detects that pattern and emits an actionable message that names
 *      the cause and gives two concrete fixes (quote the field, or use
 *      a YAML block scalar).
 *   2. Suppresses the cascading "missing or non-string `name`" error
 *      when YAML parsing already failed — there's no useful `data` to
 *      validate, so the secondary error was always redundant noise.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseSubagent } from "../src/parser/parse.js";

let workDir: string;

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "agelin-parse-err-"));
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function writeAgent(name: string, content: string): string {
  const path = join(workDir, name);
  writeFileSync(path, content, "utf8");
  return path;
}

describe("parse-error explainer", () => {
  // The wild-corpus pattern: a multi-line unquoted description that
  // begins fine, wraps onto continuation lines, and then includes
  // `<example>` somewhere in those continuation lines. YAML can't tell
  // where the description value ends because the angle bracket starts
  // a new flow-style indicator.
  const WILD_EXAMPLE_AGENT = `---
name: example-tag-test
description: Use this agent when the user wants help with something
  that requires examples to demonstrate the expected behaviour.
  Examples:

  <example>
  Context: a user asks for help.
  user: "do the thing"
  assistant: "I'll do the thing now."
  </example>

  <example>
  Context: a different user.
  user: "do another thing"
  </example>
tools:
  - Read
---

Body.
`;

  // KNOWN ISSUE — test isolation:
  // gray-matter's underlying YAML parser has observable cross-call state
  // when one parse fails. After an unclosed flow mapping (e.g. `{ key:`)
  // throws once, the next parse on the same process silently returns
  // empty data instead of re-throwing on a different malformed input.
  // The cascade-suppression test exercises a SECOND parse failure, so
  // it lives in its own file (`parse-error-cascade.test.ts`) where it
  // gets a fresh process and reliable behaviour. The integration-level
  // proof that the suppression works lives in the wild-corpus scan
  // (parse-error fires went 14 -> 7 between 0.2.2 and 0.2.2).

  test("YAML failure with unquoted <example> emits the friendly hint", () => {
    const path = writeAgent("example-tag.md", WILD_EXAMPLE_AGENT);
    const subagent = parseSubagent(path);
    const yamlErr = subagent.parseErrors.find((e) =>
      e.includes("frontmatter YAML failed to parse"),
    );
    expect(yamlErr).toBeDefined();
    expect(yamlErr).toContain("<example>");
    expect(yamlErr).toMatch(/quotes|block scalar/i);
  });

  test("YAML failure WITHOUT angle brackets falls back to the generic message", () => {
    const path = writeAgent(
      "broken-yaml.md",
      `---
name: broken
description: { key: "value", oops: "no closing brace"
---

Body.
`,
    );
    const subagent = parseSubagent(path);
    const yamlErr = subagent.parseErrors.find((e) =>
      e.includes("malformed YAML frontmatter"),
    );
    expect(yamlErr).toBeDefined();
    expect(yamlErr).not.toContain("<example>");
  });

  test("missing-name is still reported when YAML parses but name is absent", () => {
    // The cascade-suppression must only fire when YAML actually failed.
    // A well-formed agent with no `name:` field should still get the
    // missing-name error.
    const path = writeAgent(
      "no-name.md",
      `---
description: Use when the user asks for something.
---

Body.
`,
    );
    const subagent = parseSubagent(path);
    expect(
      subagent.parseErrors.some((e) =>
        e.includes("missing or non-string `name`"),
      ),
    ).toBe(true);
  });
});
