/**
 * Backend abstraction tests.
 *
 * Covers:
 *   - pickBackend("auto") prefers claude-code when ANTHROPIC_API_KEY is unset
 *     and the `claude` binary is on PATH (we stub the probe).
 *   - pickBackend("api") always returns the api backend.
 *   - The api backend feeds an injected fake AnthropicLike client through
 *     runConversation and emits a well-formed RunResult.
 *   - The claude-code backend invokes a fake `spawn` (no real CLI required),
 *     parses the JSON it produces, cleans up the temp agent file, and
 *     emits a well-formed RunResult.
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { ApiBackend } from "../src/eval/backends/api.js";
import {
  ClaudeCodeBackend,
  type SpawnFn,
} from "../src/eval/backends/claude-code.js";
import { pickBackend } from "../src/eval/backends/index.js";
import { createSandbox } from "../src/eval/sandbox.js";
import type {
  AnthropicLike,
  AnthropicMessageResponse,
} from "../src/eval/conversation.js";
import type { GoldenTask, ParsedSubagent } from "../src/types.js";

// ---------------------------------------------------------------------------
// fixtures

function makeAgent(tools: string[] = ["Read"]): ParsedSubagent {
  const raw = [
    "---",
    "name: fake-agent",
    "description: A test agent.",
    `tools: [${tools.map((t) => `"${t}"`).join(", ")}]`,
    "---",
    "",
    "You are a test agent.",
  ].join("\n");
  return {
    path: "/tmp/fake.md",
    raw,
    frontmatter: { name: "fake-agent", description: "A test agent.", tools },
    body: "You are a test agent.",
    bodyTokens: 5,
    parseErrors: [],
  };
}

function makeTask(): GoldenTask {
  return {
    id: "task-1",
    category: "debug",
    title: "stub",
    prompt: "summarize a.txt",
    fixtures: { "a.txt": "alpha-bravo-charlie" },
    assertion: { kind: "contains", needle: "alpha" },
    budget: {},
  };
}

// ---------------------------------------------------------------------------
// pickBackend

describe("pickBackend", () => {
  // pickBackend reads the env at call time, so swap a copy for the duration
  // of each test.
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    savedEnv.PATH = process.env.PATH;
  });

  afterEach(() => {
    if (savedEnv.ANTHROPIC_API_KEY === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY;
    }
    if (savedEnv.PATH === undefined) {
      delete process.env.PATH;
    } else {
      process.env.PATH = savedEnv.PATH;
    }
  });

  test('explicit "api" always returns the api backend', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const b = await pickBackend("api");
    expect(b.id).toBe("api");
  });

  test('explicit "claude-code" always returns the claude-code backend', async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-fake";
    const b = await pickBackend("claude-code");
    expect(b.id).toBe("claude-code");
  });

  test('"auto" picks claude-code when claude is on PATH and no API key', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    // Point PATH at a directory containing a fake `claude` shim.
    const shimDir = createClaudeShim();
    try {
      process.env.PATH = shimDir;
      const b = await pickBackend("auto");
      expect(b.id).toBe("claude-code");
    } finally {
      rmSync(shimDir, { recursive: true, force: true });
    }
  });

  test('"auto" falls back to api when no claude on PATH', async () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-fake";
    // PATH set to a known-empty dir guarantees the probe fails.
    const empty = mkdtempSync(join(tmpdir(), "agelin-empty-"));
    try {
      process.env.PATH = empty;
      const b = await pickBackend("auto");
      expect(b.id).toBe("api");
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// ApiBackend

describe("ApiBackend", () => {
  test("uses an injected fake AnthropicLike client and returns a RunResult", async () => {
    const fakeClient: AnthropicLike = {
      messages: {
        async create(): Promise<AnthropicMessageResponse> {
          return {
            content: [
              { type: "text", text: "found the alpha line in a.txt" },
            ],
            usage: { input_tokens: 17, output_tokens: 11 },
            stop_reason: "end_turn",
          };
        },
      },
    };

    const backend = new ApiBackend(fakeClient);
    const sb = await createSandbox(makeTask());
    try {
      const result = await backend.runOnce(makeAgent(), makeTask(), {
        model: "claude-sonnet-4-6",
        sandbox: sb,
        apiKey: "sk-ant-test",
      });
      expect(result.taskId).toBe("task-1");
      expect(result.agentName).toBe("fake-agent");
      expect(result.success).toBe(true);
      expect(result.output).toContain("alpha");
      expect(result.inputTokens).toBe(17);
      expect(result.outputTokens).toBe(11);
      expect(result.costUsd).toBeGreaterThan(0);
    } finally {
      await sb.dispose();
    }
  });

  test("isAvailable returns true when an override client is provided", async () => {
    const fake: AnthropicLike = {
      messages: {
        async create(): Promise<AnthropicMessageResponse> {
          throw new Error("not used");
        },
      },
    };
    const backend = new ApiBackend(fake);
    expect(await backend.isAvailable()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ClaudeCodeBackend

describe("ClaudeCodeBackend", () => {
  test("invokes a mocked spawn, parses JSON, and cleans up the temp agent", async () => {
    // Use a per-test agents dir under tmp so we don't touch ~/.claude.
    const fakeAgentsDir = mkdtempSync(join(tmpdir(), "agelin-agents-"));

    let spawnedArgv: string[] | undefined;
    let spawnedCwd: string | undefined;
    let observedTempPath: string | undefined;

    const fakeSpawn: SpawnFn = ((command: string, args: readonly string[], opts: { cwd?: string }) => {
      spawnedArgv = [command, ...args];
      spawnedCwd = opts.cwd;
      // The temp agent file should already exist on disk by the time spawn
      // is invoked. Snapshot the path so we can check cleanup later.
      const filenames = readdirSafe(fakeAgentsDir);
      const match = filenames.find((f) => f.startsWith("_agelin-"));
      if (match) observedTempPath = join(fakeAgentsDir, match);

      const ee = new EventEmitter() as EventEmitter & {
        stdout: Readable;
        stderr: Readable;
        kill?: () => void;
      };
      ee.stdout = Readable.from([
        JSON.stringify({
          type: "result",
          subtype: "success",
          result: "I read a.txt and saw the alpha-bravo-charlie line.",
          usage: { input_tokens: 200, output_tokens: 30 },
          total_cost_usd: 0,
          num_turns: 2,
          duration_ms: 1234,
          is_error: false,
          session_id: "sess-1",
        }) + "\n",
      ]);
      ee.stderr = Readable.from([""]);
      ee.kill = () => undefined;
      // Fire `close` on the next tick so listeners attach in time.
      setImmediate(() => ee.emit("close", 0));
      return ee as unknown as ReturnType<SpawnFn>;
    }) as SpawnFn;

    const backend = new ClaudeCodeBackend({
      spawnFn: fakeSpawn,
      agentsDir: fakeAgentsDir,
    });

    const sb = await createSandbox(makeTask());
    try {
      const result = await backend.runOnce(makeAgent(), makeTask(), {
        model: "claude-sonnet-4-6",
        sandbox: sb,
      });

      expect(result.taskId).toBe("task-1");
      expect(result.agentName).toBe("fake-agent");
      expect(result.success).toBe(true);
      expect(result.output).toContain("alpha-bravo-charlie");
      expect(result.inputTokens).toBe(200);
      expect(result.outputTokens).toBe(30);
      // Max-plan covers the spend, so we report 0 even though the run was real.
      expect(result.costUsd).toBe(0);
      // The CLI doesn't expose per-tool counts via --output-format json yet.
      expect(result.toolCalls).toEqual([]);

      // Verify the spawn invocation was shaped correctly.
      expect(spawnedArgv?.[0]).toBe("claude");
      expect(spawnedArgv).toContain("-p");
      expect(spawnedArgv).toContain("--output-format");
      expect(spawnedArgv).toContain("json");
      // --bare was intentionally removed (it forces ANTHROPIC_API_KEY auth
      // and disables OAuth/keychain reads, defeating the Max-plan flow).
      expect(spawnedArgv).not.toContain("--bare");
      expect(spawnedArgv).toContain("--add-dir");
      expect(spawnedCwd).toBe(sb.root);

      // The prompt arg should reference @<temp-agent-name>.
      const promptIdx = spawnedArgv!.indexOf("-p") + 1;
      const prompt = spawnedArgv![promptIdx]!;
      expect(prompt).toMatch(/@_agelin-/);
      expect(prompt).toContain("summarize a.txt");

      // Temp agent file must be gone after runOnce completes.
      expect(observedTempPath).toBeDefined();
      expect(existsSync(observedTempPath!)).toBe(false);
    } finally {
      await sb.dispose();
      rmSync(fakeAgentsDir, { recursive: true, force: true });
    }
  });

  test("surfaces a friendly error when the CLI exits non-zero", async () => {
    const fakeAgentsDir = mkdtempSync(join(tmpdir(), "agelin-agents-"));
    const fakeSpawn: SpawnFn = ((_cmd: string, _args: readonly string[]) => {
      const ee = new EventEmitter() as EventEmitter & {
        stdout: Readable;
        stderr: Readable;
        kill?: () => void;
      };
      ee.stdout = Readable.from([""]);
      ee.stderr = Readable.from(["boom: something went wrong\n"]);
      ee.kill = () => undefined;
      setImmediate(() => ee.emit("close", 2));
      return ee as unknown as ReturnType<SpawnFn>;
    }) as SpawnFn;

    const backend = new ClaudeCodeBackend({
      spawnFn: fakeSpawn,
      agentsDir: fakeAgentsDir,
    });

    const sb = await createSandbox(makeTask());
    try {
      const result = await backend.runOnce(makeAgent(), makeTask(), {
        model: "claude-sonnet-4-6",
        sandbox: sb,
      });
      expect(result.success).toBe(false);
      expect(result.failureReason ?? "").toMatch(/claude cli/);
      expect(result.failureReason ?? "").toMatch(/boom/);
    } finally {
      await sb.dispose();
      rmSync(fakeAgentsDir, { recursive: true, force: true });
    }
  });

  test("rewrites the agent name in the materialized markdown", async () => {
    const fakeAgentsDir = mkdtempSync(join(tmpdir(), "agelin-agents-"));
    let materializedContent: string | undefined;

    const fakeSpawn: SpawnFn = ((_cmd: string, _args: readonly string[]) => {
      // Capture file contents at spawn time, before the runOnce finally block
      // deletes it.
      const filenames = readdirSafe(fakeAgentsDir);
      const match = filenames.find((f) => f.startsWith("_agelin-"));
      if (match) {
        materializedContent = readFileSync(join(fakeAgentsDir, match), "utf8");
      }
      const ee = new EventEmitter() as EventEmitter & {
        stdout: Readable;
        stderr: Readable;
        kill?: () => void;
      };
      ee.stdout = Readable.from([
        JSON.stringify({
          result: "alpha",
          usage: { input_tokens: 5, output_tokens: 5 },
          is_error: false,
        }) + "\n",
      ]);
      ee.stderr = Readable.from([""]);
      ee.kill = () => undefined;
      setImmediate(() => ee.emit("close", 0));
      return ee as unknown as ReturnType<SpawnFn>;
    }) as SpawnFn;

    const backend = new ClaudeCodeBackend({
      spawnFn: fakeSpawn,
      agentsDir: fakeAgentsDir,
    });
    const sb = await createSandbox(makeTask());
    try {
      await backend.runOnce(makeAgent(), makeTask(), {
        model: "claude-sonnet-4-6",
        sandbox: sb,
      });
      expect(materializedContent).toBeDefined();
      // Original `name: fake-agent` line must have been rewritten to the
      // unique temp name so it can't collide with anything in ~/.claude.
      expect(materializedContent!).toMatch(/name:\s*_agelin-/);
      expect(materializedContent!).not.toMatch(/name:\s*fake-agent\b/);
    } finally {
      await sb.dispose();
      rmSync(fakeAgentsDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// helpers

function readdirSafe(dir: string): string[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Build a tmpdir containing a no-op `claude` shim so `which`-style probes
 * succeed. On Windows we drop a .cmd file; elsewhere a +x shell script.
 */
function createClaudeShim(): string {
  const dir = mkdtempSync(join(tmpdir(), "agelin-shim-"));
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  if (process.platform === "win32") {
    fs.writeFileSync(join(dir, "claude.cmd"), "@echo claude shim 0.0.0\r\nexit /b 0\r\n");
  } else {
    const path = join(dir, "claude");
    fs.writeFileSync(path, "#!/bin/sh\necho 'claude shim 0.0.0'\nexit 0\n");
    fs.chmodSync(path, 0o755);
  }
  return dir;
}
