/**
 * Core types for agelin.
 * Every layer (parser, rules, eval, scoring, reporters) imports from here.
 * This file is the contract — keep it stable.
 */

import type { MarkdownAST } from "./parser/markdown.js";

// ============================================================================
// PARSED SUBAGENT
// ============================================================================

export type SubagentTool =
  | "Read"
  | "Write"
  | "Edit"
  | "Bash"
  | "Glob"
  | "Grep"
  | "WebFetch"
  | "WebSearch"
  | "Task"
  | "TodoWrite"
  | string;

export interface SubagentFrontmatter {
  name: string;
  description: string;
  tools?: SubagentTool[] | string;
  model?: string;
  color?: string;
  category?: string;
  [key: string]: unknown;
}

export interface ParsedSubagent {
  /** absolute path to the source markdown file */
  path: string;
  /** raw file contents */
  raw: string;
  /** parsed YAML frontmatter */
  frontmatter: SubagentFrontmatter;
  /** markdown body (system prompt) with frontmatter stripped */
  body: string;
  /** approximate token count of body */
  bodyTokens: number;
  /** parser-level errors (e.g. malformed YAML) */
  parseErrors: string[];
  /**
   * Optional tokenized markdown AST. Populated by the parser; absent on
   * partial-construction code paths (e.g. file-read failures). Rules opt
   * in by reading this field.
   */
  ast?: MarkdownAST;
}

// ============================================================================
// STATIC RULES
// ============================================================================

export type Severity = "error" | "warning" | "suggestion";

export interface Issue {
  ruleId: string;
  severity: Severity;
  message: string;
  /** optional source location: line number in the original file */
  line?: number;
  /** optional fix-it hint */
  fix?: string;
  /** doc link explaining why this matters */
  docUrl?: string;
}

export interface Rule {
  /** unique stable id, e.g. "tool-overreach" */
  id: string;
  /** default severity (configurable per project) */
  defaultSeverity: Severity;
  /** one-line description shown in --list-rules */
  description: string;
  /** the actual check */
  check(subagent: ParsedSubagent): Issue[];
}

// ============================================================================
// EVAL HARNESS
// ============================================================================

export type TaskCategory = "code-review" | "research" | "debug" | string;

export interface GoldenTask {
  id: string;
  category: TaskCategory;
  /** one-line title */
  title: string;
  /** the user message sent to the subagent */
  prompt: string;
  /** optional file fixtures placed in the agent's working dir */
  fixtures?: Record<string, string>;
  /** assertion: how to decide if the agent succeeded */
  assertion: TaskAssertion;
  /** budget: kill the run if it exceeds these */
  budget: {
    maxTokens?: number;
    maxCostUsd?: number;
    maxDurationSec?: number;
    maxToolCalls?: number;
  };
}

export type TaskAssertion =
  | { kind: "contains"; needle: string; caseSensitive?: boolean }
  | { kind: "regex"; pattern: string; flags?: string }
  | { kind: "json-path"; path: string; equals: unknown }
  | { kind: "tool-called"; tool: SubagentTool }
  | { kind: "no-tool-called"; tool: SubagentTool }
  | { kind: "any-of"; assertions: TaskAssertion[] }
  | { kind: "all-of"; assertions: TaskAssertion[] };

export interface RunResult {
  taskId: string;
  agentName: string;
  success: boolean;
  durationMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  toolCalls: { tool: string; count: number }[];
  /** the final assistant message text */
  output: string;
  /** failure reason if !success */
  failureReason?: string;
}

// ============================================================================
// SCORING
// ============================================================================

export interface AgentScore {
  agentName: string;
  agentPath: string;
  /** overall 0-100 */
  score: number;
  /** sub-scores feeding into the total */
  components: {
    /** % of static rules passing (weighted) */
    staticHealth: number;
    /** % of golden tasks passing */
    successRate: number;
    /** efficiency: lower cost-per-success scores higher */
    costEfficiency: number;
    /** consistency: low variance across runs scores higher */
    consistency: number;
  };
  staticIssues: Issue[];
  benchResults?: RunResult[];
}

// ============================================================================
// REPORTERS
// ============================================================================

export interface ReportContext {
  results: AgentScore[];
  generatedAt: string;
  toolVersion: string;
  /**
   * Hint for the console reporter: render the verbose per-issue layout
   * (message + fix + line). Tri-state:
   *   - `true`  — force verbose
   *   - `false` — force summary
   *   - `undefined` — auto: verbose iff exactly one agent
   *
   * Other reporters (json, markdown, html) ignore this field.
   */
  verbose?: boolean;
}

export interface Reporter {
  name: "console" | "json" | "html" | "markdown";
  render(ctx: ReportContext): string;
}

// ============================================================================
// CONFIG
// ============================================================================

export interface SubagentLintConfig {
  /** glob patterns relative to cwd */
  include: string[];
  exclude?: string[];
  /**
   * Preset(s) to extend from.
   *   - "agelin:recommended" — every rule at its defaultSeverity (the implicit default)
   *   - "agelin:strict"      — bumps each active rule up one notch
   *
   * Multiple presets compose left-to-right; the user's explicit `rules`
   * field always wins last.
   */
  extends?: string | string[];
  /**
   * Plugin module specifiers to load. Each module must default-export
   * `{ name: string, rules: Rule[] }`. Relative paths are resolved
   * against the config file's directory; bare specifiers go through
   * Node's package resolution.
   *
   * Plugin rule ids are namespaced as `<plugin.name>/<rule.id>`.
   */
  plugins?: string[];
  /** override severities per rule id (wins over `extends`) */
  rules?: Record<string, Severity | "off">;
  /** which categories of golden tasks to run during bench */
  benchCategories?: TaskCategory[];
  /** number of repeats per task (for consistency measurement) */
  benchRepeats?: number;
  /** anthropic model to use for the benchmark runs */
  benchModel?: string;
}

export const DEFAULT_CONFIG: SubagentLintConfig = {
  include: [".claude/agents/**/*.md"],
  exclude: ["**/node_modules/**"],
  benchRepeats: 3,
  benchModel: "claude-sonnet-4-6",
};
