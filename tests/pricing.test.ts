import { describe, expect, test, beforeEach } from "bun:test";
import {
  MODEL_PRICING,
  priceUsage,
  _resetPricingWarnings,
} from "../src/eval/pricing.js";

beforeEach(() => {
  _resetPricingWarnings();
});

describe("MODEL_PRICING table", () => {
  test("Opus 4.7 is 15 / 75", () => {
    expect(MODEL_PRICING["claude-opus-4-7"]?.inputPerMTok).toBe(15);
    expect(MODEL_PRICING["claude-opus-4-7"]?.outputPerMTok).toBe(75);
  });
  test("Sonnet 4.6 is 3 / 15", () => {
    expect(MODEL_PRICING["claude-sonnet-4-6"]?.inputPerMTok).toBe(3);
    expect(MODEL_PRICING["claude-sonnet-4-6"]?.outputPerMTok).toBe(15);
  });
  test("Haiku 4.5 is 0.80 / 4 (both alias and dated form)", () => {
    expect(MODEL_PRICING["claude-haiku-4-5"]?.inputPerMTok).toBe(0.8);
    expect(MODEL_PRICING["claude-haiku-4-5"]?.outputPerMTok).toBe(4);
    expect(MODEL_PRICING["claude-haiku-4-5-20251001"]?.inputPerMTok).toBe(0.8);
    expect(MODEL_PRICING["claude-haiku-4-5-20251001"]?.outputPerMTok).toBe(4);
  });
});

describe("priceUsage", () => {
  test("Sonnet: 1M in + 1M out = $18", () => {
    const cost = priceUsage("claude-sonnet-4-6", {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(18, 6);
  });

  test("Opus: 1k in + 1k out", () => {
    const cost = priceUsage("claude-opus-4-7", {
      input_tokens: 1000,
      output_tokens: 1000,
    });
    // 1000/1M * 15 + 1000/1M * 75 = 0.015 + 0.075 = 0.09
    expect(cost).toBeCloseTo(0.09, 6);
  });

  test("Haiku: 1M in + 1M out = $4.80", () => {
    const cost = priceUsage("claude-haiku-4-5", {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(4.8, 6);
  });

  test("includes cache_read and cache_creation tokens", () => {
    const cost = priceUsage("claude-sonnet-4-6", {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
      cache_creation_input_tokens: 1_000_000,
    });
    // 1 * 0.30 + 1 * 3.75 = 4.05
    expect(cost).toBeCloseTo(4.05, 6);
  });

  test("unknown model falls back to Sonnet 4.6 rates", () => {
    // Suppress console.warn during test
    const originalWarn = console.warn;
    console.warn = () => {};
    try {
      const known = priceUsage("claude-sonnet-4-6", {
        input_tokens: 100,
        output_tokens: 100,
      });
      const unknown = priceUsage("claude-future-model-9000", {
        input_tokens: 100,
        output_tokens: 100,
      });
      expect(unknown).toBeCloseTo(known, 8);
    } finally {
      console.warn = originalWarn;
    }
  });

  test("handles zero tokens", () => {
    expect(
      priceUsage("claude-sonnet-4-6", { input_tokens: 0, output_tokens: 0 }),
    ).toBe(0);
  });
});
