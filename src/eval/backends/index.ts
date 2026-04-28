/**
 * Backend abstraction for the eval harness.
 *
 * A "backend" is anything that can take a (ParsedSubagent, GoldenTask) pair
 * and produce a RunResult. Two implementations ship with agelin:
 *
 *   - "api"         — direct Anthropic Messages API (requires ANTHROPIC_API_KEY,
 *                     bills against the API console)
 *   - "claude-code" — spawns the local `claude` CLI in headless mode, which
 *                     uses the user's Claude Code Max plan instead. Free for
 *                     anyone with a Max subscription.
 *
 * `pickBackend("auto")` chooses claude-code when the `claude` binary is on PATH
 * and ANTHROPIC_API_KEY is missing; otherwise it returns api. Callers can
 * force a specific backend by passing "api" or "claude-code" explicitly.
 */

import { spawnSync } from "node:child_process";
import type { GoldenTask, ParsedSubagent, RunResult } from "../../types.js";
import type { Sandbox } from "../sandbox.js";
import { ApiBackend } from "./api.js";
import { ClaudeCodeBackend } from "./claude-code.js";

export type BackendId = "api" | "claude-code";

export interface BackendOpts {
  model: string;
  sandbox: Sandbox;
  apiKey?: string;
  timeoutMs?: number;
}

export interface Backend {
  id: BackendId;
  isAvailable(): Promise<boolean>;
  /** Run a single agent against a single task, return a RunResult. */
  runOnce(
    agent: ParsedSubagent,
    task: GoldenTask,
    opts: BackendOpts,
  ): Promise<RunResult>;
}

/**
 * Resolve a Backend instance for the given preference.
 *
 *   "api"          -> always returns the direct-API backend
 *   "claude-code"  -> always returns the CLI-subprocess backend
 *   "auto" (default)
 *                  -> claude-code if `claude` is on PATH and no API key in env
 *                  -> api otherwise
 */
export async function pickBackend(
  preferred: BackendId | "auto" = "auto",
): Promise<Backend> {
  if (preferred === "api") return new ApiBackend();
  if (preferred === "claude-code") return new ClaudeCodeBackend();

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  const claudeOnPath = isClaudeCliAvailable();
  if (claudeOnPath && !hasApiKey) return new ClaudeCodeBackend();
  return new ApiBackend();
}

/**
 * Probe for a `claude` binary on PATH. Synchronous + fast: we just attempt
 * `claude --version` with a tight timeout. Any non-zero exit (or spawn error)
 * means "not available". Exposed as a separate helper so tests can stub it.
 *
 * We pass `env: process.env` explicitly so runtime overrides to
 * `process.env.PATH` (notably under bun, which otherwise uses the parent
 * process's original env) are honored.
 */
export function isClaudeCliAvailable(): boolean {
  try {
    const result = spawnSync("claude", ["--version"], {
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 3_000,
      encoding: "utf8",
      shell: process.platform === "win32",
      env: process.env,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

// Re-export the concrete backends so callers that want to construct one
// directly (e.g. tests) don't need a deeper import path.
export { ApiBackend } from "./api.js";
export { ClaudeCodeBackend } from "./claude-code.js";
