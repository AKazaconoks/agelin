import { describe, expect, test } from "bun:test";
import {
  ProgressTracker,
  makeRunId,
  type CacheHitInfo,
  type RunEndInfo,
  type RunStartInfo,
} from "../src/eval/progress.js";
import type { RunResult } from "../src/types.js";

function mkResult(success: boolean, costUsd = 0.01): RunResult {
  return {
    taskId: "t1",
    agentName: "agent-a",
    success,
    durationMs: 100,
    costUsd,
    inputTokens: 10,
    outputTokens: 10,
    toolCalls: [],
    output: success ? "ok" : "",
    failureReason: success ? undefined : "boom",
  };
}

describe("ProgressTracker", () => {
  test("emits start with the declared total", () => {
    const t = new ProgressTracker();
    let captured = -1;
    t.on("start", (info: { total: number }) => {
      captured = info.total;
    });
    t.start(10);
    expect(captured).toBe(10);
  });

  test("snapshot reflects runStart and runEnd", () => {
    const t = new ProgressTracker();
    t.start(2);
    const info: RunStartInfo = {
      runId: makeRunId("agent-a", "t1", 0),
      agentName: "agent-a",
      taskId: "t1",
      repeat: 0,
      totalRepeats: 1,
    };
    t.runStart(info);
    expect(t.snapshot().currentRuns).toEqual([info.runId]);
    t.runEnd({ ...info, result: mkResult(true, 0.05) });
    const snap = t.snapshot();
    expect(snap.completed).toBe(1);
    expect(snap.failed).toBe(0);
    expect(snap.currentRuns).toEqual([]);
    expect(snap.costUsd).toBeCloseTo(0.05, 8);
  });

  test("counts failures", () => {
    const t = new ProgressTracker();
    t.start(2);
    const info: RunStartInfo = {
      runId: makeRunId("a", "t", 0),
      agentName: "a",
      taskId: "t",
      repeat: 0,
      totalRepeats: 1,
    };
    t.runEnd({ ...info, result: mkResult(false, 0.01) });
    expect(t.snapshot().failed).toBe(1);
  });

  test("cacheHit increments completed and cached but not cost", () => {
    const t = new ProgressTracker();
    t.start(3);
    const events: string[] = [];
    t.on("cacheHit", (_info: CacheHitInfo) => events.push("cacheHit"));
    t.on("runEnd", (_info: RunEndInfo) => events.push("runEnd"));

    t.cacheHit({
      runId: makeRunId("a", "t", 0),
      agentName: "a",
      taskId: "t",
      repeat: 0,
      totalRepeats: 1,
      result: mkResult(true, 99), // cost ignored for cache hits
    });
    const snap = t.snapshot();
    expect(snap.completed).toBe(1);
    expect(snap.cached).toBe(1);
    expect(snap.costUsd).toBe(0);
    expect(events).toEqual(["cacheHit"]);
  });

  test("emits done when total reached", () => {
    const t = new ProgressTracker();
    let doneCalled = false;
    t.on("done", () => {
      doneCalled = true;
    });
    t.start(2);
    t.cacheHit({
      runId: makeRunId("a", "t", 0),
      agentName: "a",
      taskId: "t",
      repeat: 0,
      totalRepeats: 2,
      result: mkResult(true),
    });
    expect(doneCalled).toBe(false);
    t.cacheHit({
      runId: makeRunId("a", "t", 1),
      agentName: "a",
      taskId: "t",
      repeat: 1,
      totalRepeats: 2,
      result: mkResult(true),
    });
    expect(doneCalled).toBe(true);
  });

  test("emits start, runStart, runEnd, done in order for one run", () => {
    const t = new ProgressTracker();
    const seq: string[] = [];
    t.on("start", () => seq.push("start"));
    t.on("runStart", () => seq.push("runStart"));
    t.on("runEnd", () => seq.push("runEnd"));
    t.on("done", () => seq.push("done"));

    t.start(1);
    const info: RunStartInfo = {
      runId: makeRunId("a", "t", 0),
      agentName: "a",
      taskId: "t",
      repeat: 0,
      totalRepeats: 1,
    };
    t.runStart(info);
    t.runEnd({ ...info, result: mkResult(true) });
    expect(seq).toEqual(["start", "runStart", "runEnd", "done"]);
  });

  test("makeRunId is stable", () => {
    expect(makeRunId("a", "t", 0)).toBe("a::t::0");
  });
});
