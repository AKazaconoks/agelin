# subagent templates

Drop-in starting points for your own `.claude/agents/`. Each template
passes `agelin check` cleanly (or with one optional `suggestion`
flag — never errors or warnings).

| Template | Score | Use when |
|---|---:|---|
| [`code-reviewer.md`](./code-reviewer.md) | 100/100 | User asks to review a file or PR diff |
| [`debug-helper.md`](./debug-helper.md) | 98/100 | User pages with a stack trace or error log |
| [`test-runner.md`](./test-runner.md) | 100/100 | User wants to run + interpret the test suite |

## How to use

```bash
cp templates/code-reviewer.md ~/.claude/agents/
# customize the body to your project's conventions
agelin check ~/.claude/agents/code-reviewer.md
```

Each template is intentionally narrow in scope. Pick one that matches
your job, then narrow further — these are starting points, not finished
agents.

## What makes them score 100

- **Frontmatter description** uses the trigger-condition pattern
  ("Use when ..."), with concrete examples.
- **Tools list** is minimal and matches the body — no copy-paste
  kitchen-sink tools that go unused.
- **Inputs**, **Constraints**, **Workflow**, **Output** sections in
  every body — passes the input/output contract rules.
- **Action verbs** in the body match the declared tools (we mention
  what we'll Read, what we'll Edit).
- **Stop conditions** are explicit. No "until satisfied" or "when
  done" — concrete predicates instead.
- **No hype clichés** ("expert in", "world-class", "comprehensive"
  removed even when they would have been technically true).

Read the rule reference for the full list of patterns these templates
are written to satisfy: [`docs/rules.md`](../docs/rules.md).
