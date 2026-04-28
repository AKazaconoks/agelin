/**
 * Conversation loop tests. Uses a fake AnthropicLike client — no real API.
 * Verifies that tool_use blocks are dispatched to executeTool and the
 * resulting tool_result is appended to the message history.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSandbox } from "../src/eval/sandbox.js";
import {
  runConversation,
  type AnthropicCreateParams,
  type AnthropicLike,
  type AnthropicMessageResponse,
} from "../src/eval/conversation.js";
import type { GoldenTask, ParsedSubagent } from "../src/types.js";

function makeAgent(tools: string[] = ["Read", "Write"]): ParsedSubagent {
  return {
    path: "/tmp/fake.md",
    raw: "",
    frontmatter: { name: "fake", description: "test agent", tools },
    body: "you are a test agent",
    bodyTokens: 4,
    parseErrors: [],
  };
}

function makeTask(): GoldenTask {
  return {
    id: "tt",
    category: "debug",
    title: "stub",
    prompt: "please read a.txt",
    fixtures: { "a.txt": "alpha-content" },
    assertion: { kind: "contains", needle: "alpha" },
    budget: {},
  };
}

interface Scripted {
  responses: AnthropicMessageResponse[];
  calls: AnthropicCreateParams[];
}

function scriptedClient(responses: AnthropicMessageResponse[]): {
  client: AnthropicLike;
  state: Scripted;
} {
  const state: Scripted = { responses: responses.slice(), calls: [] };
  const client: AnthropicLike = {
    messages: {
      async create(params): Promise<AnthropicMessageResponse> {
        // Deep-clone so callers see the messages exactly as they were at
        // call time, even if the loop later mutates the shared array.
        state.calls.push(JSON.parse(JSON.stringify(params)));
        const next = state.responses.shift();
        if (!next) {
          throw new Error("scripted client ran out of responses");
        }
        return next;
      },
    },
  };
  return { client, state };
}

describe("runConversation", () => {
  test("executes a single tool_use then ends on end_turn", async () => {
    const sb = await createSandbox(makeTask());
    try {
      const { client, state } = scriptedClient([
        {
          content: [
            {
              type: "tool_use",
              id: "tu_1",
              name: "Read",
              input: { file_path: "a.txt" },
            },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
          stop_reason: "tool_use",
        },
        {
          content: [
            { type: "text", text: "I read it: alpha-content is what I saw." },
          ],
          usage: { input_tokens: 12, output_tokens: 8 },
          stop_reason: "end_turn",
        },
      ]);

      const result = await runConversation(
        client,
        makeAgent(["Read"]),
        makeTask(),
        sb,
        { model: "fake-model" },
      );

      expect(result.turns).toBe(2);
      expect(result.finalText).toContain("alpha-content");
      expect(result.toolCalls).toEqual([{ tool: "Read", count: 1 }]);
      expect(result.totalUsage.input_tokens).toBe(22);
      expect(result.totalUsage.output_tokens).toBe(13);
      expect(result.abortedReason).toBeUndefined();

      // The second call must have a tool_result block in its message history.
      expect(state.calls.length).toBe(2);
      const second = state.calls[1];
      const lastMsg = second.messages[second.messages.length - 1];
      expect(lastMsg.role).toBe("user");
      const blocks = lastMsg.content;
      expect(Array.isArray(blocks)).toBe(true);
      const arr = blocks as Array<{ type: string; content?: string; tool_use_id?: string }>;
      expect(arr[0].type).toBe("tool_result");
      expect(arr[0].tool_use_id).toBe("tu_1");
      expect(arr[0].content).toBe("alpha-content");
    } finally {
      await sb.dispose();
    }
  });

  test("a Write tool_use actually mutates the sandbox", async () => {
    const sb = await createSandbox(makeTask());
    try {
      const { client } = scriptedClient([
        {
          content: [
            {
              type: "tool_use",
              id: "tu_w",
              name: "Write",
              input: { file_path: "out.txt", content: "written-by-agent" },
            },
          ],
          usage: { input_tokens: 5, output_tokens: 3 },
          stop_reason: "tool_use",
        },
        {
          content: [{ type: "text", text: "done" }],
          usage: { input_tokens: 6, output_tokens: 2 },
          stop_reason: "end_turn",
        },
      ]);

      await runConversation(client, makeAgent(["Write"]), makeTask(), sb, {
        model: "fake-model",
      });
      expect(readFileSync(join(sb.root, "out.txt"), "utf8")).toBe(
        "written-by-agent",
      );
    } finally {
      await sb.dispose();
    }
  });

  test("ends immediately when the first response has no tool_use", async () => {
    const sb = await createSandbox(makeTask());
    try {
      const { client, state } = scriptedClient([
        {
          content: [{ type: "text", text: "no tools needed" }],
          usage: { input_tokens: 4, output_tokens: 4 },
          stop_reason: "end_turn",
        },
      ]);
      const r = await runConversation(client, makeAgent([]), makeTask(), sb, {
        model: "fake-model",
      });
      expect(r.turns).toBe(1);
      expect(r.finalText).toBe("no tools needed");
      expect(state.calls.length).toBe(1);
      // No tools declared on the agent => no `tools` field in the request.
      expect(state.calls[0].tools).toBeUndefined();
    } finally {
      await sb.dispose();
    }
  });

  test("aborts cleanly when budget is exceeded mid-loop", async () => {
    const sb = await createSandbox(makeTask());
    try {
      // Each turn returns a tool_use so we'd loop forever absent budget.
      const looper: AnthropicMessageResponse = {
        content: [
          {
            type: "tool_use",
            id: "tu_x",
            name: "Read",
            input: { file_path: "a.txt" },
          },
        ],
        usage: { input_tokens: 1000, output_tokens: 1000 },
        stop_reason: "tool_use",
      };
      const { client } = scriptedClient([looper, looper, looper, looper]);
      const tinyBudgetTask: GoldenTask = {
        ...makeTask(),
        budget: { maxTokens: 500 },
      };
      const r = await runConversation(
        client,
        makeAgent(["Read"]),
        tinyBudgetTask,
        sb,
        { model: "fake-model" },
      );
      expect(r.abortedReason).toBeDefined();
      expect(r.abortedReason).toContain("token budget");
    } finally {
      await sb.dispose();
    }
  });
});
