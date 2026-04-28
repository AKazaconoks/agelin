/**
 * Per-model pricing for the Anthropic Messages API.
 *
 * All numbers are USD per million tokens. Cache read/write columns mirror
 * Anthropic's prompt-caching pricing (5x base for writes, 0.1x base for reads
 * is the published default, but we prefer explicit numbers per model so
 * regressions in upstream pricing surface as test failures).
 *
 * If `priceUsage` sees an unknown model we fall back to Sonnet rates and warn
 * exactly once per process so we never crash a benchmark mid-run on a typo.
 */

export interface ModelPricing {
  /** USD per million input tokens */
  inputPerMTok: number;
  /** USD per million output tokens */
  outputPerMTok: number;
  /** USD per million tokens read from prompt cache (typically 0.1x input) */
  cacheReadPerMTok?: number;
  /** USD per million tokens written to prompt cache (typically 1.25x input) */
  cacheWritePerMTok?: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // --- Opus ----------------------------------------------------------------
  "claude-opus-4-7": {
    inputPerMTok: 15,
    outputPerMTok: 75,
    cacheReadPerMTok: 1.5,
    cacheWritePerMTok: 18.75,
  },
  "claude-opus-4-7-20251201": {
    inputPerMTok: 15,
    outputPerMTok: 75,
    cacheReadPerMTok: 1.5,
    cacheWritePerMTok: 18.75,
  },
  "claude-opus-4-5": {
    inputPerMTok: 15,
    outputPerMTok: 75,
    cacheReadPerMTok: 1.5,
    cacheWritePerMTok: 18.75,
  },

  // --- Sonnet --------------------------------------------------------------
  "claude-sonnet-4-6": {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },
  "claude-sonnet-4-6-20251015": {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },
  "claude-sonnet-4-5": {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },
  "claude-sonnet-4-5-20250929": {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },

  // --- Haiku ---------------------------------------------------------------
  "claude-haiku-4-5": {
    inputPerMTok: 0.8,
    outputPerMTok: 4,
    cacheReadPerMTok: 0.08,
    cacheWritePerMTok: 1,
  },
  "claude-haiku-4-5-20251001": {
    inputPerMTok: 0.8,
    outputPerMTok: 4,
    cacheReadPerMTok: 0.08,
    cacheWritePerMTok: 1,
  },

  // --- Older aliases (kept for compat with older agent configs) ------------
  "claude-3-5-sonnet-latest": {
    inputPerMTok: 3,
    outputPerMTok: 15,
    cacheReadPerMTok: 0.3,
    cacheWritePerMTok: 3.75,
  },
  "claude-3-5-haiku-latest": {
    inputPerMTok: 0.8,
    outputPerMTok: 4,
    cacheReadPerMTok: 0.08,
    cacheWritePerMTok: 1,
  },
};

const FALLBACK_MODEL = "claude-sonnet-4-6";
const warned = new Set<string>();

export interface UsageInput {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}

/**
 * Convert a usage record to USD cost using `MODEL_PRICING`. Cache read/write
 * tokens are billed separately from regular input tokens — Anthropic's API
 * already excludes cache hits from `input_tokens`, so we just sum the buckets.
 */
export function priceUsage(model: string, usage: UsageInput): number {
  const pricing = MODEL_PRICING[model] ?? fallbackPricing(model);

  const inputCost = (usage.input_tokens / 1_000_000) * pricing.inputPerMTok;
  const outputCost = (usage.output_tokens / 1_000_000) * pricing.outputPerMTok;

  let cacheReadCost = 0;
  if (usage.cache_read_input_tokens && pricing.cacheReadPerMTok !== undefined) {
    cacheReadCost =
      (usage.cache_read_input_tokens / 1_000_000) * pricing.cacheReadPerMTok;
  }

  let cacheWriteCost = 0;
  if (
    usage.cache_creation_input_tokens &&
    pricing.cacheWritePerMTok !== undefined
  ) {
    cacheWriteCost =
      (usage.cache_creation_input_tokens / 1_000_000) * pricing.cacheWritePerMTok;
  }

  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

function fallbackPricing(model: string): ModelPricing {
  if (!warned.has(model)) {
    warned.add(model);
    console.warn(
      `[pricing] Unknown model "${model}", falling back to ${FALLBACK_MODEL} rates. Add it to MODEL_PRICING for accurate cost reporting.`,
    );
  }
  return MODEL_PRICING[FALLBACK_MODEL]!;
}

/** Test helper — clear the "we warned about this model" memo. */
export function _resetPricingWarnings(): void {
  warned.clear();
}
