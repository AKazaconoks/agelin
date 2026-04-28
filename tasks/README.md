# Golden tasks

This directory holds the benchmark suite. Each `.json` file is one task; the
benchmark runner (`src/eval/runner.ts`) replays every task against every
subagent under test, then scores the answer with the task's `assertion`.

## File layout

```
tasks/
  code-review/   — given some code, find the bug
  research/      — answer a factual question (often requires WebSearch)
  debug/         — given a stack trace or log, diagnose the cause
```

A new category is just a new directory — `bench` reads them by glob.

## File format

A task is a JSON document matching the `GoldenTask` interface in
`src/types.ts`. Required fields:

| field       | type                | what it is                                         |
| ----------- | ------------------- | -------------------------------------------------- |
| `id`        | string              | matches the basename of the file (no `.json`)      |
| `category`  | string              | matches the parent directory name                  |
| `title`     | string              | one-line human description                         |
| `prompt`    | string              | the user message sent to the subagent              |
| `fixtures`  | `Record<string,string>` (optional) | files placed in the agent's working dir |
| `assertion` | `TaskAssertion`     | how to decide whether the agent succeeded          |
| `budget`    | object              | hard limits — the run is killed if exceeded        |

### `assertion` shapes

```ts
{ kind: "contains";        needle: string; caseSensitive?: boolean }
{ kind: "regex";           pattern: string; flags?: string }
{ kind: "json-path";       path: string; equals: unknown }
{ kind: "tool-called";     tool: string }
{ kind: "no-tool-called";  tool: string }
{ kind: "any-of";          assertions: TaskAssertion[] }
{ kind: "all-of";          assertions: TaskAssertion[] }
```

Compose `any-of` and `all-of` to express OR / AND. The runner evaluates the
assertion against the agent's final assistant message text (and, for
`tool-called`, the recorded `RunResult.toolCalls`).

### `budget`

Pick conservative defaults so a misbehaving agent can't eat the whole API
quota. The current suite uses:

```json
{
  "maxTokens": 8000,
  "maxCostUsd": 0.10,
  "maxDurationSec": 60,
  "maxToolCalls": 10
}
```

The first limit reached terminates the run and counts as a failure with
`failureReason: "budget"`.

## Adding a new task

1. Pick a category directory (or create one).
2. Choose a stable `id` — kebab-case, matches the filename.
3. Write the prompt as if a real user typed it. Don't telegraph the answer.
4. If the task needs source code or logs, embed them in `fixtures`. Keep them
   small (low hundreds of lines max) — every byte is in the agent's context
   window.
5. Pick the **loosest** assertion that still distinguishes a real answer from
   a hallucinated one. Examples:
   - "Did the agent identify SQL injection?" -> `contains "SQL injection"`
   - "Did the agent point at concurrency?" -> `any-of [race | mutex | concurrent]`
   - "Did the agent diagnose root cause + fix?" -> `all-of [contains "None", contains "before"]`
6. Run `bun run lint` to confirm the JSON parses (it's checked at boot).

## Calibrating assertion strictness

The hardest part of a benchmark suite is keeping assertions tight enough that
random text doesn't pass, loose enough that valid-but-differently-phrased
answers don't fail. When you add a task:

- Run it against 3–5 known-good subagents and confirm they all pass.
- Run it against an obviously-wrong agent (or feed in a deliberately bad
  answer) and confirm it fails.
- If the false-positive rate looks high, tighten with `all-of`. If it looks
  too strict, loosen with `any-of` or accept synonyms.

## Conventions

- No emojis in prompts or fixtures.
- Prompts are written in plain English, second person where natural.
- Fixtures use realistic, recognizable patterns. They should look like
  something a working engineer might have actually written.
- Task `id`, `category`, and filename must agree.
