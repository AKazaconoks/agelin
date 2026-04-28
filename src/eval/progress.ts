/**
 * Reactive progress tracker for benchmark runs.
 *
 * The runner emits lifecycle events; the CLI subscribes and renders them.
 * Keeping this isolated from rendering means tests can assert on event
 * sequences without spinning up a TTY, and the same tracker can drive a TTY
 * progress bar, a JSON event stream, or a future web UI.
 *
 * Event taxonomy (intentionally small):
 *   start     — total work known, nothing started yet
 *   runStart  — a (agent, task, repeat) triple began
 *   runEnd    — a triple finished (success or failure)
 *   cacheHit  — a triple was satisfied from disk cache (no API call made)
 *   done      — all triples accounted for
 *
 * Listeners should treat events as fire-and-forget; rendering errors must
 * not break the benchmark.
 */

import { EventEmitter } from "node:events";
import type { RunResult } from "../types.js";

export interface RunStartInfo {
  /** Stable id used for the `currentRuns` set: "<agent>::<task>::<repeat>". */
  runId: string;
  agentName: string;
  taskId: string;
  /** 0-based repeat index. */
  repeat: number;
  /** Total repeats requested for this (agent, task). */
  totalRepeats: number;
}

export interface RunEndInfo extends RunStartInfo {
  result: RunResult;
}

export interface CacheHitInfo extends RunStartInfo {
  result: RunResult;
}

export interface ProgressSnapshot {
  total: number;
  completed: number;
  cached: number;
  failed: number;
  costUsd: number;
  /** Run ids currently in flight. */
  currentRuns: string[];
  /** Wall-clock ms since `start`. */
  elapsedMs: number;
}

/**
 * Build a stable run id from the triple. Exported so callers can correlate
 * runStart / runEnd / cacheHit events without re-deriving the format.
 */
export function makeRunId(
  agentName: string,
  taskId: string,
  repeat: number,
): string {
  return `${agentName}::${taskId}::${repeat}`;
}

export interface ProgressEvents {
  start: [{ total: number }];
  runStart: [RunStartInfo];
  runEnd: [RunEndInfo];
  cacheHit: [CacheHitInfo];
  done: [ProgressSnapshot];
}

export class ProgressTracker extends EventEmitter {
  private _total = 0;
  private _completed = 0;
  private _cached = 0;
  private _failed = 0;
  private _costUsd = 0;
  private _currentRuns: Set<string> = new Set();
  private _startedAt: number | null = null;

  /** Declare the total amount of work and emit `start`. */
  start(total: number): void {
    this._total = total;
    this._completed = 0;
    this._cached = 0;
    this._failed = 0;
    this._costUsd = 0;
    this._currentRuns.clear();
    this._startedAt = Date.now();
    this.emit("start", { total });
  }

  runStart(info: RunStartInfo): void {
    this._currentRuns.add(info.runId);
    this.emit("runStart", info);
  }

  runEnd(info: RunEndInfo): void {
    this._currentRuns.delete(info.runId);
    this._completed += 1;
    if (!info.result.success) this._failed += 1;
    this._costUsd += info.result.costUsd ?? 0;
    this.emit("runEnd", info);
    this._maybeDone();
  }

  cacheHit(info: CacheHitInfo): void {
    // Cache hits never enter `currentRuns` — they short-circuit the run.
    this._completed += 1;
    this._cached += 1;
    if (!info.result.success) this._failed += 1;
    // Cache hits cost 0 (we already paid). Don't double-count.
    this.emit("cacheHit", info);
    this._maybeDone();
  }

  /** Force-emit `done` regardless of completed counter. Useful on error abort. */
  finish(): void {
    this.emit("done", this.snapshot());
  }

  snapshot(): ProgressSnapshot {
    return {
      total: this._total,
      completed: this._completed,
      cached: this._cached,
      failed: this._failed,
      costUsd: this._costUsd,
      currentRuns: Array.from(this._currentRuns),
      elapsedMs: this._startedAt ? Date.now() - this._startedAt : 0,
    };
  }

  private _maybeDone(): void {
    if (this._total > 0 && this._completed >= this._total) {
      this.emit("done", this.snapshot());
    }
  }
}
