/**
 * Multi-turn agent conversation loop.
 *
 * Replaces the v0 single-shot recorder. Each turn:
 *   1. Send the message history to Anthropic.
 *   2. Accumulate token usage.
 *   3. If the response contains `tool_use` blocks, execute each via
 *      `executeTool` against the sandbox, append `tool_result` content blocks
 *      back into the history, and loop.
 *   4. If `stop_reason === "end_turn"` (or no tool calls were issued) we are
 *      done and return.
 *
 * Defensive caps:
 *   - Hard turn limit (`MAX_TURNS = 12`) regardless of budget.
 *   - Per-turn `enforceBudget` check; abort early with a populated
 *     `abortedReason` if a ceiling is crossed.
 *
 * Pure host / sandbox-driven: no real Anthropic key required when callers
 * inject a fake `AnthropicLike` client (see runner.ts for the prod wiring).
 */

import type { GoldenTask, ParsedSubagent, RunResult, SubagentTool } from "../types.js";
import { enforceBudget } from "./budget.js";
import { executeTool } from "./tools.js";
import { priceUsage } from "./pricing.js";
import { withRetry } from "./retry.js";
import type { Sandbox } from "./sandbox.js";

const MAX_TURNS = 12;
const DEFAULT_MAX_TOKENS = 1024;

// ---------------------------------------------------------------------------
// Anthropic client surface (subset)

export interface AnthropicLike {
  messages: {
    create(params: AnthropicCreateParams): Promise<AnthropicMessageResponse>;
  };
}

export interface AnthropicToolDef {
  name: string;
  description?: string;
  input_schema: { type: "object"; properties?: Record<string, unknown> };
}

export type AnthropicTextBlock = { type: "text"; text: string };
export type AnthropicToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};
export type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

export type AnthropicAssistantBlock = AnthropicTextBlock | AnthropicToolUseBlock;
export type AnthropicUserBlock = { type: "text"; text: string } | AnthropicToolResultBlock;

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicAssistantBlock[] | AnthropicUserBlock[];
}

export interface AnthropicCreateParams {
  model: string;
  max_tokens: number;
  system?: string;
  messages: AnthropicMessage[];
  tools?: AnthropicToolDef[];
}

export interface AnthropicMessageResponse {
  content: AnthropicAssistantBlock[];
  usage: { input_tokens: number; output_tokens: number };
  stop_reason?: string | null;
}

// ---------------------------------------------------------------------------
// Conversation result

export interface ConversationOpts {
  model: string;
  maxTokens?: number;
}

export interface ConversationResult {
  finalText: string;
  toolCalls: { tool: string; count: number }[];
  totalUsage: { input_tokens: number; output_tokens: number };
  turns: number;
  abortedReason?: string;
}

// ---------------------------------------------------------------------------
// Tool def builder
//
// We translate the agent's declared tool list into Anthropic tool definitions
// with realistic input schemas. Only declare tools the agent has access to —
// the model can still hallucinate names but won't be encouraged to.

const KNOWN_SCHEMAS: Record<string, AnthropicToolDef> = {
  Read: {
    name: "Read",
    description: "Read a file from the workspace.",
    input_schema: {
      type: "object",
      properties: { file_path: { type: "string" } },
    },
  },
  Write: {
    name: "Write",
    description: "Write a file to the workspace (creates dirs as needed).",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string" },
        content: { type: "string" },
      },
    },
  },
  Edit: {
    name: "Edit",
    description: "Replace exactly one occurrence of old_string with new_string in the named file.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string" },
        old_string: { type: "string" },
        new_string: { type: "string" },
      },
    },
  },
  Glob: {
    name: "Glob",
    description: "Find files matching a glob pattern, scoped to the workspace.",
    input_schema: {
      type: "object",
      properties: { pattern: { type: "string" } },
    },
  },
  Grep: {
    name: "Grep",
    description: "Search file contents for a regex within the workspace.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string" },
        path: { type: "string" },
        glob: { type: "string" },
        "-i": { type: "boolean" },
      },
    },
  },
  Bash: {
    name: "Bash",
    description: "Run a sandboxed shell command (allowlist of read-only tools and version probes).",
    input_schema: {
      type: "object",
      properties: { command: { type: "string" } },
    },
  },
};

export function buildToolDefs(
  tools: SubagentTool[] | string | undefined,
): AnthropicToolDef[] {
  if (!tools) return [];
  const list = Array.isArray(tools)
    ? tools
    : tools
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const defs: AnthropicToolDef[] = [];
  for (const name of list) {
    if (Object.prototype.hasOwnProperty.call(KNOWN_SCHEMAS, name)) {
      defs.push(KNOWN_SCHEMAS[name]);
    } else {
      // Unknown tool — register a free-form schema so the model can still emit
      // the call, but the executor will reject it.
      defs.push({
        name,
        description: `Custom tool "${name}" (not implemented in sandbox).`,
        input_schema: { type: "object", properties: {} },
      });
    }
  }
  return defs;
}

// ---------------------------------------------------------------------------
// Main loop

export async function runConversation(
  client: AnthropicLike,
  agent: ParsedSubagent,
  task: GoldenTask,
  sandbox: Sandbox,
  opts: ConversationOpts,
): Promise<ConversationResult> {
  const tools = buildToolDefs(agent.frontmatter.tools);
  const messages: AnthropicMessage[] = [
    { role: "user", content: task.prompt },
  ];

  let totalIn = 0;
  let totalOut = 0;
  const toolCounts = new Map<string, number>();
  let finalText = "";
  let turn = 0;
  let abortedReason: string | undefined;
  const startedAt = Date.now();

  while (turn < MAX_TURNS) {
    turn++;

    const params: AnthropicCreateParams = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: agent.body,
      messages,
    };
    if (tools.length > 0) params.tools = tools;

    // Retry transient transport errors (429, 5xx, ECONNRESET, fetch network
    // errors). Auth/programming errors (400/401/403) propagate immediately.
    const response = await withRetry(() => client.messages.create(params));

    totalIn += response.usage?.input_tokens ?? 0;
    totalOut += response.usage?.output_tokens ?? 0;

    // Capture text + tool_use blocks. The "final" assistant text is the text
    // emitted on the most recent turn; we overwrite each iteration.
    const assistantBlocks: AnthropicAssistantBlock[] = response.content ?? [];
    const turnText = assistantBlocks
      .filter((b): b is AnthropicTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (turnText) finalText = turnText;

    const toolUses = assistantBlocks.filter(
      (b): b is AnthropicToolUseBlock => b.type === "tool_use",
    );
    for (const tu of toolUses) {
      toolCounts.set(tu.name, (toolCounts.get(tu.name) ?? 0) + 1);
    }

    // Append the assistant's full reply to the history so the next turn (if
    // any) sees it. Even when there are no tool uses we'll break right after.
    messages.push({ role: "assistant", content: assistantBlocks });

    // No tool calls => the model is done talking, regardless of stop_reason.
    if (toolUses.length === 0) {
      break;
    }

    // Execute each tool_use and feed the results back as a single user turn
    // containing all tool_result blocks (Anthropic's expected shape).
    const resultBlocks: AnthropicToolResultBlock[] = [];
    for (const tu of toolUses) {
      const tr = await executeTool(tu.name, tu.input, sandbox);
      resultBlocks.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: truncate(tr.output, 8_000),
        is_error: !tr.ok,
      });
    }
    messages.push({ role: "user", content: resultBlocks });

    // Budget check after every turn — accumulated tokens, accumulated cost,
    // accumulated tool count, elapsed wall time.
    const partial: Partial<RunResult> = {
      inputTokens: totalIn,
      outputTokens: totalOut,
      costUsd: priceUsage(opts.model, {
        input_tokens: totalIn,
        output_tokens: totalOut,
      }),
      durationMs: Date.now() - startedAt,
      toolCalls: Array.from(toolCounts.entries()).map(([tool, count]) => ({
        tool,
        count,
      })),
    };
    const verdict = enforceBudget(task, partial);
    if (verdict.exceeded) {
      abortedReason = verdict.reason;
      break;
    }

    if (response.stop_reason === "end_turn") {
      // Model said it's done, but also emitted tool_use this turn? Edge case;
      // we honor end_turn and stop.
      break;
    }
  }

  if (turn >= MAX_TURNS && abortedReason === undefined) {
    abortedReason = `hit hard turn cap (${MAX_TURNS})`;
  }

  return {
    finalText,
    toolCalls: Array.from(toolCounts.entries()).map(([tool, count]) => ({
      tool,
      count,
    })),
    totalUsage: { input_tokens: totalIn, output_tokens: totalOut },
    turns: turn,
    abortedReason,
  };
}

// ---------------------------------------------------------------------------

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n... [truncated ${s.length - max} chars]`;
}
