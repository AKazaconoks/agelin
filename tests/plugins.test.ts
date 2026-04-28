/**
 * Tests for the plugin loader.
 *
 * The loader takes a list of module specifiers + a config dir and
 * returns the union of every plugin's rules with ids namespaced as
 * `<plugin-name>/<rule-id>`. Relative specifiers resolve against the
 * config dir; bare specifiers go through Node package resolution.
 *
 * Tests cover:
 *   - Loading a relative-path plugin and finding its rules namespaced
 *   - Rules from a plugin actually fire when run against a subagent
 *   - Two plugins with the same name are rejected
 *   - Malformed plugins (missing name, missing rules, bad rule shape)
 *     throw clear errors
 *   - Empty/undefined specifier list returns []
 *
 * The tests write plugin .js files to a tmpdir so we exercise real
 * dynamic-import resolution, not a mock.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadPlugins } from "../src/plugins.js";
import type { ParsedSubagent } from "../src/types.js";

let workDir: string;

const VALID_PLUGIN_SOURCE = `
export default {
  name: "test-plugin",
  rules: [
    {
      id: "no-loud",
      defaultSeverity: "warning",
      description: "Body must not contain the word LOUD.",
      check(subagent) {
        if ((subagent.body || "").includes("LOUD")) {
          return [{
            ruleId: "no-loud",
            severity: "warning",
            message: "body contains LOUD",
          }];
        }
        return [];
      },
    },
  ],
};
`;

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "agelin-plugins-"));
});

afterAll(() => {
  rmSync(workDir, { recursive: true, force: true });
});

function mkSubagent(body: string): ParsedSubagent {
  return {
    path: "test.md",
    raw: body,
    frontmatter: { name: "test", description: "test" },
    body,
    bodyTokens: Math.ceil(body.length / 4),
    parseErrors: [],
    ast: undefined,
  };
}

describe("loadPlugins", () => {
  test("undefined / empty specifier list returns []", async () => {
    expect(await loadPlugins(undefined, workDir)).toEqual([]);
    expect(await loadPlugins([], workDir)).toEqual([]);
  });

  test("loads a relative-path plugin and namespaces its rule ids", async () => {
    const file = join(workDir, "valid.js");
    writeFileSync(file, VALID_PLUGIN_SOURCE, "utf8");

    const rules = await loadPlugins(["./valid.js"], workDir);
    expect(rules.length).toBe(1);
    expect(rules[0]!.id).toBe("test-plugin/no-loud");
    expect(rules[0]!.defaultSeverity).toBe("warning");
  });

  test("plugin rule check() fires against a real subagent", async () => {
    const file = join(workDir, "valid.js");
    writeFileSync(file, VALID_PLUGIN_SOURCE, "utf8");

    const rules = await loadPlugins(["./valid.js"], workDir);
    const rule = rules[0]!;
    expect(rule.check(mkSubagent("we are LOUD here")).length).toBe(1);
    expect(rule.check(mkSubagent("we are quiet here")).length).toBe(0);
  });

  test("rejects a plugin missing the `name` field", async () => {
    const file = join(workDir, "no-name.js");
    writeFileSync(
      file,
      `export default { rules: [] };`,
      "utf8",
    );
    expect(loadPlugins(["./no-name.js"], workDir)).rejects.toThrow(
      /must declare a non-empty string `name`/,
    );
  });

  test("rejects a plugin whose name isn't kebab-case", async () => {
    const file = join(workDir, "bad-name.js");
    writeFileSync(
      file,
      `export default { name: "Bad Name!", rules: [] };`,
      "utf8",
    );
    expect(loadPlugins(["./bad-name.js"], workDir)).rejects.toThrow(
      /kebab-case identifier/,
    );
  });

  test("rejects a plugin missing the `rules` array", async () => {
    const file = join(workDir, "no-rules.js");
    writeFileSync(
      file,
      `export default { name: "x" };`,
      "utf8",
    );
    expect(loadPlugins(["./no-rules.js"], workDir)).rejects.toThrow(
      /must declare `rules` as an array/,
    );
  });

  test("rejects a rule missing required fields", async () => {
    const file = join(workDir, "bad-rule.js");
    writeFileSync(
      file,
      `export default {
         name: "x",
         rules: [{ id: "foo", description: "no severity, no check" }],
       };`,
      "utf8",
    );
    expect(loadPlugins(["./bad-rule.js"], workDir)).rejects.toThrow(
      /missing required fields/,
    );
  });

  test("rejects two plugins with the same name", async () => {
    const fileA = join(workDir, "dup-a.js");
    const fileB = join(workDir, "dup-b.js");
    const src = `export default { name: "dup", rules: [] };`;
    writeFileSync(fileA, src, "utf8");
    writeFileSync(fileB, src, "utf8");

    expect(
      loadPlugins(["./dup-a.js", "./dup-b.js"], workDir),
    ).rejects.toThrow(/Two plugins declared the same name "dup"/);
  });

  test("merges rules from multiple plugins", async () => {
    const fileA = join(workDir, "multi-a.js");
    const fileB = join(workDir, "multi-b.js");
    writeFileSync(
      fileA,
      `export default {
         name: "alpha",
         rules: [{
           id: "rule-a",
           defaultSeverity: "warning",
           description: "alpha rule",
           check() { return []; }
         }]
       };`,
      "utf8",
    );
    writeFileSync(
      fileB,
      `export default {
         name: "beta",
         rules: [{
           id: "rule-b",
           defaultSeverity: "suggestion",
           description: "beta rule",
           check() { return []; }
         }]
       };`,
      "utf8",
    );
    const rules = await loadPlugins(
      ["./multi-a.js", "./multi-b.js"],
      workDir,
    );
    expect(rules.map((r) => r.id).sort()).toEqual([
      "alpha/rule-a",
      "beta/rule-b",
    ]);
  });

  test("surfaces a friendly error when the plugin file does not exist", async () => {
    expect(loadPlugins(["./does-not-exist.js"], workDir)).rejects.toThrow(
      /Failed to load plugin/,
    );
  });
});
