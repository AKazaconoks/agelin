/**
 * Tests for the config-preset system.
 *
 * `agelin:recommended` returns each rule at its defaultSeverity. `agelin:strict`
 * bumps each active rule up one notch (suggestion -> warning, warning ->
 * error, error stays error). Disabled rules stay disabled. Unknown
 * preset names throw a clear message.
 *
 * `applyExtends` composes preset(s) + user's explicit `rules` and is the
 * single integration point in `loadConfig`.
 */

import { describe, expect, test } from "bun:test";
import { applyExtends, resolvePreset } from "../src/presets.js";
import { ALL_RULES } from "../src/rules/index.js";

describe("resolvePreset", () => {
  test("agelin:recommended returns each rule at its defaultSeverity", () => {
    const map = resolvePreset("agelin:recommended");
    for (const rule of ALL_RULES) {
      expect(map[rule.id]).toBe(rule.defaultSeverity);
    }
  });

  test("agelin:strict bumps suggestion -> warning, warning -> error", () => {
    const map = resolvePreset("agelin:strict");
    for (const rule of ALL_RULES) {
      const got = map[rule.id];
      switch (rule.defaultSeverity) {
        case "suggestion":
          expect(got).toBe("warning");
          break;
        case "warning":
          expect(got).toBe("error");
          break;
        case "error":
          expect(got).toBe("error");
          break;
      }
    }
  });

  test("agelin:strict covers every rule in the registry (no missing keys)", () => {
    const map = resolvePreset("agelin:strict");
    expect(Object.keys(map).length).toBe(ALL_RULES.length);
  });

  test("unknown preset throws with valid options listed", () => {
    expect(() => resolvePreset("agelin:reckless")).toThrow(
      /Unknown preset.*agelin:recommended.*agelin:strict/,
    );
  });
});

describe("applyExtends", () => {
  test("undefined extends + no user rules returns empty map", () => {
    expect(applyExtends(undefined, undefined)).toEqual({});
  });

  test("extends preset only", () => {
    const map = applyExtends("agelin:recommended", undefined);
    expect(Object.keys(map).length).toBe(ALL_RULES.length);
  });

  test("user rules win over preset", () => {
    const map = applyExtends("agelin:strict", { "no-examples": "off" });
    expect(map["no-examples"]).toBe("off");
    // Other rules still bumped by strict:
    const someSuggestion = ALL_RULES.find(
      (r) => r.defaultSeverity === "suggestion" && r.id !== "no-examples",
    );
    if (someSuggestion) {
      expect(map[someSuggestion.id]).toBe("warning");
    }
  });

  test("array of presets composes left-to-right", () => {
    // recommended sets baseline; strict overrides on top.
    const map = applyExtends(
      ["agelin:recommended", "agelin:strict"],
      undefined,
    );
    // Final state = strict (later preset wins).
    const sample = ALL_RULES.find((r) => r.defaultSeverity === "warning");
    if (sample) {
      expect(map[sample.id]).toBe("error");
    }
  });

  test("user rules override even composed presets", () => {
    const sample = ALL_RULES[0]!;
    const map = applyExtends("agelin:strict", { [sample.id]: "off" });
    expect(map[sample.id]).toBe("off");
  });
});
