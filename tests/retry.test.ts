import { describe, expect, test } from "bun:test";
import { isRetryable, withRetry } from "../src/eval/retry.js";

const noSleep = async () => {};

describe("withRetry", () => {
  test("succeeds on first try without retrying", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        return "ok";
      },
      { sleep: noSleep },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  test("retries 2x then succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) {
          const err = new Error("rate limited") as Error & { status: number };
          err.status = 429;
          throw err;
        }
        return "won";
      },
      { sleep: noSleep, attempts: 5, baseDelayMs: 1 },
    );
    expect(result).toBe("won");
    expect(calls).toBe(3);
  });

  test("does not retry on 401", async () => {
    let calls = 0;
    const err = new Error("auth") as Error & { status: number };
    err.status = 401;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw err;
        },
        { sleep: noSleep, attempts: 5, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("auth");
    expect(calls).toBe(1);
  });

  test("does not retry on 400 or 403", async () => {
    for (const status of [400, 403]) {
      let calls = 0;
      const err = new Error(`http ${status}`) as Error & { status: number };
      err.status = status;
      await expect(
        withRetry(
          async () => {
            calls += 1;
            throw err;
          },
          { sleep: noSleep, attempts: 5, baseDelayMs: 1 },
        ),
      ).rejects.toThrow(`http ${status}`);
      expect(calls).toBe(1);
    }
  });

  test("retries 5xx", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 2) {
          const err = new Error("svr") as Error & { status: number };
          err.status = 503;
          throw err;
        }
        return calls;
      },
      { sleep: noSleep, attempts: 3, baseDelayMs: 1 },
    );
    expect(result).toBe(2);
  });

  test("retries ECONNRESET", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 2) {
          const err = new Error("reset") as Error & { code: string };
          err.code = "ECONNRESET";
          throw err;
        }
        return "ok";
      },
      { sleep: noSleep, attempts: 3, baseDelayMs: 1 },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(2);
  });

  test("gives up after `attempts` and throws last error", async () => {
    let calls = 0;
    const err = new Error("nope") as Error & { status: number };
    err.status = 500;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw err;
        },
        { sleep: noSleep, attempts: 3, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("nope");
    expect(calls).toBe(3);
  });

  test("honors numeric Retry-After (seconds)", async () => {
    const slept: number[] = [];
    let calls = 0;
    await withRetry(
      async () => {
        calls += 1;
        if (calls < 2) {
          const err = new Error("rl") as Error & {
            status: number;
            headers: Record<string, string>;
          };
          err.status = 429;
          err.headers = { "retry-after": "2" };
          throw err;
        }
        return "ok";
      },
      {
        sleep: async (ms) => {
          slept.push(ms);
        },
        attempts: 3,
        baseDelayMs: 50_000,
      },
    );
    expect(slept).toEqual([2000]);
  });

  test("honors HTTP-date Retry-After", async () => {
    const slept: number[] = [];
    let calls = 0;
    const fixedNow = 1_000_000_000_000;
    const futureMs = fixedNow + 5000;
    await withRetry(
      async () => {
        calls += 1;
        if (calls < 2) {
          const err = new Error("rl") as Error & {
            status: number;
            headers: Record<string, string>;
          };
          err.status = 429;
          err.headers = { "Retry-After": new Date(futureMs).toUTCString() };
          throw err;
        }
        return "ok";
      },
      {
        sleep: async (ms) => {
          slept.push(ms);
        },
        now: () => fixedNow,
        attempts: 3,
        baseDelayMs: 50_000,
      },
    );
    expect(slept.length).toBe(1);
    // Within 1s tolerance for HTTP-date second-resolution
    expect(slept[0]).toBeGreaterThanOrEqual(4000);
    expect(slept[0]).toBeLessThanOrEqual(6000);
  });

  test("supports headers via .get() (fetch-style Headers)", async () => {
    const slept: number[] = [];
    let calls = 0;
    await withRetry(
      async () => {
        calls += 1;
        if (calls < 2) {
          const err = new Error("rl") as Error & {
            status: number;
            headers: { get(k: string): string | null };
          };
          err.status = 429;
          err.headers = {
            get(k: string) {
              return k.toLowerCase() === "retry-after" ? "3" : null;
            },
          };
          throw err;
        }
        return "ok";
      },
      {
        sleep: async (ms) => {
          slept.push(ms);
        },
        attempts: 3,
        baseDelayMs: 999_999,
      },
    );
    expect(slept).toEqual([3000]);
  });
});

describe("isRetryable", () => {
  test("treats 429/408/5xx as retryable", () => {
    expect(isRetryable({ status: 429 })).toBe(true);
    expect(isRetryable({ status: 408 })).toBe(true);
    expect(isRetryable({ status: 500 })).toBe(true);
    expect(isRetryable({ status: 503 })).toBe(true);
  });
  test("treats 400/401/403/404 as non-retryable", () => {
    expect(isRetryable({ status: 400 })).toBe(false);
    expect(isRetryable({ status: 401 })).toBe(false);
    expect(isRetryable({ status: 403 })).toBe(false);
    expect(isRetryable({ status: 404 })).toBe(false);
  });
  test("treats fetch network errors as retryable", () => {
    expect(isRetryable({ code: "ECONNRESET" })).toBe(true);
    expect(isRetryable({ code: "ETIMEDOUT" })).toBe(true);
    expect(isRetryable(new TypeError("fetch failed"))).toBe(true);
  });
});
