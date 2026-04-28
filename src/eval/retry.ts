/**
 * Exponential-backoff retry helper.
 *
 * Wraps any async function and retries on transient failures (HTTP 429, 408,
 * 5xx, network errors). Programming/auth bugs (400, 401, 403) bubble up
 * immediately — retrying those just wastes time and budget.
 *
 * Detection is structural: we do not import the Anthropic SDK error classes
 * here. Instead we sniff `status` / `statusCode`, `headers`, and `code` on
 * whatever the caller throws. That keeps this module reusable for plain
 * `fetch` errors and for tests using fake errors.
 */

export interface RetryOpts {
  /** Total attempts including the first call. Default: 5. */
  attempts?: number;
  /** Initial delay in milliseconds. Default: 1000. */
  baseDelayMs?: number;
  /** Cap on any single delay, in milliseconds. Default: 30000. */
  maxDelayMs?: number;
  /** Exponential growth factor. Default: 2. */
  factor?: number;
  /** Jitter ratio applied as +/- (0..1). Default: 0.25. */
  jitter?: number;
  /** Override the sleep impl — used by tests. Default: setTimeout-based. */
  sleep?: (ms: number) => Promise<void>;
  /** Override clock for Retry-After: "HTTP-date" parsing — used by tests. */
  now?: () => number;
  /**
   * Optional hook fired before each retry. Useful for surfacing telemetry
   * to a progress UI. Not awaited.
   */
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
}

const DEFAULTS: Required<Omit<RetryOpts, "onRetry" | "sleep" | "now">> = {
  attempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  factor: 2,
  jitter: 0.25,
};

/** Run `fn` with exponential backoff. Throws the last error if all attempts fail. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOpts = {},
): Promise<T> {
  const cfg = { ...DEFAULTS, ...opts };
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? Date.now;

  let lastError: unknown;
  for (let attempt = 1; attempt <= cfg.attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) throw err;
      if (attempt >= cfg.attempts) throw err;

      const retryAfterMs = parseRetryAfter(err, now);
      const delayMs =
        retryAfterMs !== null
          ? Math.min(retryAfterMs, cfg.maxDelayMs)
          : computeBackoff(attempt, cfg);

      if (opts.onRetry) {
        try {
          opts.onRetry({ attempt, delayMs, error: err });
        } catch {
          /* ignore hook failures */
        }
      }
      await sleep(delayMs);
    }
  }
  // Unreachable, but TS wants it.
  throw lastError;
}

// ---------------------------------------------------------------------------

/** Decide if an error indicates a transient condition worth retrying. */
export function isRetryable(err: unknown): boolean {
  const status = readStatus(err);
  if (status !== null) {
    if (status === 429 || status === 408) return true;
    if (status >= 500 && status < 600) return true;
    // 400/401/403 and other 4xx -> non-retryable
    return false;
  }

  // No status -> probably a transport-level failure. Sniff `code` and message.
  const code = readCode(err);
  if (code) {
    const transient = new Set([
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EAI_AGAIN",
      "EPIPE",
      "ECONNABORTED",
      "UND_ERR_SOCKET",
      "UND_ERR_CONNECT_TIMEOUT",
      "UND_ERR_HEADERS_TIMEOUT",
      "UND_ERR_BODY_TIMEOUT",
    ]);
    if (transient.has(code)) return true;
  }

  // fetch's TypeError("fetch failed") + node's "fetch failed" wrapper
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("fetch failed") ||
      msg.includes("network") ||
      msg.includes("socket hang up") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout")
    ) {
      return true;
    }
  }

  return false;
}

function readStatus(err: unknown): number | null {
  if (!err || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;
  if (typeof e.status === "number") return e.status;
  if (typeof e.statusCode === "number") return e.statusCode;
  // Anthropic SDK: response is sometimes nested
  const response = e.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === "number") return response.status;
  return null;
}

function readCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;
  if (typeof e.code === "string") return e.code;
  // node fetch wraps causes
  const cause = e.cause as Record<string, unknown> | undefined;
  if (cause && typeof cause.code === "string") return cause.code;
  return null;
}

/** Read a Retry-After header off the error, returning ms or null. */
function parseRetryAfter(err: unknown, now: () => number): number | null {
  if (!err || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;

  let raw: string | undefined;
  const headers = e.headers;
  if (headers && typeof headers === "object") {
    const h = headers as Record<string, unknown> | { get?: (k: string) => unknown };
    if (typeof (h as { get?: unknown }).get === "function") {
      const v = (h as { get: (k: string) => unknown }).get("retry-after");
      if (typeof v === "string") raw = v;
    } else {
      const rec = h as Record<string, unknown>;
      const v = rec["retry-after"] ?? rec["Retry-After"];
      if (typeof v === "string") raw = v;
      else if (Array.isArray(v) && typeof v[0] === "string") raw = v[0];
    }
  }
  if (!raw) {
    const response = e.response as { headers?: Record<string, unknown> } | undefined;
    if (response?.headers) {
      const v = response.headers["retry-after"] ?? response.headers["Retry-After"];
      if (typeof v === "string") raw = v;
    }
  }
  if (!raw) return null;

  const trimmed = raw.trim();
  // Numeric seconds form
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const secs = Number.parseFloat(trimmed);
    if (Number.isFinite(secs) && secs >= 0) return Math.round(secs * 1000);
  }
  // HTTP-date form
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

function computeBackoff(
  attempt: number,
  cfg: { baseDelayMs: number; maxDelayMs: number; factor: number; jitter: number },
): number {
  const exp = cfg.baseDelayMs * Math.pow(cfg.factor, attempt - 1);
  const capped = Math.min(exp, cfg.maxDelayMs);
  const jitterAmt = capped * cfg.jitter;
  const delta = (Math.random() * 2 - 1) * jitterAmt;
  return Math.max(0, Math.round(capped + delta));
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
