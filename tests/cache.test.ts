import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cacheKey,
  clearCache,
  getCached,
  putCached,
} from "../src/eval/cache.js";
import type { GoldenTask, RunResult } from "../src/types.js";

const sampleTask: GoldenTask = {
  id: "t-cache-1",
  category: "code-review",
  title: "sample",
  prompt: "Review this code.",
  assertion: { kind: "contains", needle: "ok" },
  budget: { maxTokens: 500 },
};

const sampleResult: RunResult = {
  taskId: "t-cache-1",
  agentName: "agent-x",
  success: true,
  durationMs: 1234,
  costUsd: 0.0042,
  inputTokens: 100,
  outputTokens: 50,
  toolCalls: [{ tool: "Read", count: 1 }],
  output: "looks ok",
};

let originalCwd: string;
let tempDir: string;

beforeEach(() => {
  originalCwd = process.cwd();
  tempDir = mkdtempSync(join(tmpdir(), "agelin-cache-test-"));
  process.chdir(tempDir);
});

afterEach(() => {
  process.chdir(originalCwd);
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("cacheKey", () => {
  test("is deterministic for same inputs", () => {
    const k1 = cacheKey({ agentBody: "body1", task: sampleTask, model: "m1" });
    const k2 = cacheKey({ agentBody: "body1", task: sampleTask, model: "m1" });
    expect(k1).toBe(k2);
  });

  test("differs when agentBody changes", () => {
    const k1 = cacheKey({ agentBody: "body1", task: sampleTask, model: "m1" });
    const k2 = cacheKey({ agentBody: "body2", task: sampleTask, model: "m1" });
    expect(k1).not.toBe(k2);
  });

  test("differs when model changes", () => {
    const k1 = cacheKey({ agentBody: "body1", task: sampleTask, model: "m1" });
    const k2 = cacheKey({ agentBody: "body1", task: sampleTask, model: "m2" });
    expect(k1).not.toBe(k2);
  });

  test("differs when task changes", () => {
    const k1 = cacheKey({ agentBody: "body1", task: sampleTask, model: "m1" });
    const k2 = cacheKey({
      agentBody: "body1",
      task: { ...sampleTask, prompt: "different" },
      model: "m1",
    });
    expect(k1).not.toBe(k2);
  });

  test("is stable regardless of object key order", () => {
    const taskA = {
      id: "t",
      title: "x",
      category: "research" as const,
      prompt: "p",
      assertion: { kind: "contains", needle: "n" } as const,
      budget: { maxTokens: 100 },
    };
    const taskB = {
      budget: { maxTokens: 100 },
      assertion: { kind: "contains", needle: "n" } as const,
      prompt: "p",
      category: "research" as const,
      title: "x",
      id: "t",
    };
    const k1 = cacheKey({ agentBody: "b", task: taskA, model: "m" });
    const k2 = cacheKey({ agentBody: "b", task: taskB, model: "m" });
    expect(k1).toBe(k2);
  });

  test("returns 64-char hex digest (sha256)", () => {
    const k = cacheKey({ agentBody: "b", task: sampleTask, model: "m" });
    expect(k).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe("getCached / putCached", () => {
  test("missing key returns null", async () => {
    const k = cacheKey({ agentBody: "x", task: sampleTask, model: "m" });
    const got = await getCached(k);
    expect(got).toBeNull();
  });

  test("round-trip put then get", async () => {
    const k = cacheKey({
      agentBody: "agent-body",
      task: sampleTask,
      model: "claude-sonnet-4-6",
    });
    await putCached(k, sampleResult);
    const got = await getCached(k);
    expect(got).not.toBeNull();
    expect(got?.taskId).toBe(sampleResult.taskId);
    expect(got?.agentName).toBe(sampleResult.agentName);
    expect(got?.success).toBe(true);
    expect(got?.toolCalls).toEqual([{ tool: "Read", count: 1 }]);
  });

  test("corrupted file returns null instead of throwing", async () => {
    const k = cacheKey({ agentBody: "x", task: sampleTask, model: "m" });
    await putCached(k, sampleResult);
    // overwrite with junk
    const path = join(
      tempDir,
      ".agelin",
      "cache",
      `${k}.json`,
    );
    rmSync(path);
    const { writeFileSync } = await import("node:fs");
    writeFileSync(path, "{not valid json", "utf8");
    const got = await getCached(k);
    expect(got).toBeNull();
  });
});

describe("clearCache", () => {
  test("removes all entries when called with no args", async () => {
    const k1 = cacheKey({ agentBody: "a", task: sampleTask, model: "m" });
    const k2 = cacheKey({ agentBody: "b", task: sampleTask, model: "m" });
    await putCached(k1, sampleResult);
    await putCached(k2, sampleResult);
    const removed = clearCache();
    expect(removed).toBe(2);
    expect(await getCached(k1)).toBeNull();
    expect(await getCached(k2)).toBeNull();
  });

  test("returns 0 when cache dir doesn't exist", () => {
    expect(clearCache()).toBe(0);
  });
});
