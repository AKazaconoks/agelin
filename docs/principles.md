# Five principles for writing good Claude Code subagents

Distilled from 32 rules and 97 wild agents we scanned.

## 1. State the trigger, not the role

> "Use this agent when..." beats "You are a senior 10x backend engineer..."

Claude Code routes on the `description` field. The router asks: *given
this user request, which agent should handle it?* If your description
talks about WHO the agent is rather than WHEN it should be invoked,
the router has nothing to match against.

Bad:

```yaml
description: "Comprehensive expert in modern backend architecture with deep
knowledge of distributed systems and microservices."
```

Good:

```yaml
description: "Use when the user asks to design a new REST or GraphQL endpoint,
or to review service-boundary decisions in a microservices architecture.
Examples: 'design the orders API', 'review my service split'."
```

Rules that catch this: `description-uses-cliche`,
`description-too-vague`, `description-uses-examples-instead-of-summary`.

## 2. Match the tool list to what the body actually does

> If you declare a tool, the body should explain when to use it. If the
> body never refers to a tool — by name or by an action verb that
> implies it — drop the tool.

Wild stat: 246 firings of `tool-body-mismatch` across 97 popular
agents. Average 2.5 tools-per-agent declared but never instructed.

Bad:

```yaml
tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, Task
```
(body talks about reviewing code; never mentions writing, executing,
or fetching anything)

Good:

```yaml
tools: Read, Grep
```
(body says "Read the changed files. Grep for cross-references.")

Rules: `tool-body-mismatch`, `tool-list-too-broad`, `tool-overreach`.

## 3. Specify input and output contracts

> The body must say (a) what the agent expects to receive, and (b) what
> shape the deliverable will take.

94% of wild agents fail (a). 60% fail (b). The cost: callers don't know
what to pass; downstream agents don't know what to consume.

Add an `## Inputs` section explaining what the user / caller will
provide:

```markdown
## Inputs

You will be given:
- A path to a file in the repo, OR
- A unified-format git diff
- An optional language hint
```

And an `## Output` section specifying the shape:

```markdown
## Output

Return a markdown report with this structure:

- `## Findings` — list of issues, one per bullet
- `## Severity` — high / medium / low
- `## Next step` — single concrete action
```

Rules: `missing-input-preconditions`, `undefined-output-shape`,
`no-exit-criteria`.

## 4. Write actionable instructions, not tutorials

> Agents are instructions FOR the model. They are not lectures the
> model gives the user. If your body opens with "First, let's
> understand..." or "In this guide, we'll learn..." you've written a
> doc, not a prompt.

Bad:

```markdown
You are a debugging assistant. Let me explain what makes a good
debugging session. First, we should understand the difference between...
```

Good:

```markdown
You are a debugging assistant.

## Workflow

1. Read the trace once.
2. Identify the offending file:line.
3. Read the relevant function only.
4. Categorize the root cause: null deref / async / off-by-one / etc.
5. Propose a 3-5 line diff fix.
```

Rules: `hidden-tutorial`, `vague-completion-criteria`,
`no-exit-criteria`.

## 5. Build verification into mutating agents

> If the agent has `Write` / `Edit` / `Bash` permissions, the body
> must instruct the agent to verify its changes. Tests, lint,
> type-check — pick the one that matches the project.

52% of wild agents that can edit code never tell themselves to verify.
They mutate, declare done, the user discovers the breakage later.

Add a verification step to your workflow:

```markdown
## Workflow

1. ...
2. Apply the fix as a unified diff.
3. Run `npm test` (or `cargo check`, or `pytest`, etc.).
4. If tests pass: report done.
5. If tests fail: revert, re-analyze, retry up to 3 times.
```

Rules: `no-verification-step`, `unbounded-retry`,
`contradictory-role-capability`.

---

## How to start from scratch

The fastest path to a 95+ score:

1. Copy the closest match from `templates/` (`code-reviewer`,
   `test-runner`, or `debug-helper`).
2. Customize the description's trigger condition and examples.
3. Run `agelin check <your-agent>.md`.
4. Fix the findings the linter reports.
5. (Optional) `agelin bench` to score actual problem-solving.

If you score below 70 on your first try, that's normal — work through
the principles above. If you score below 40, the agent likely has
parse errors or is missing critical sections. The detailed `docs/rules.md`
will tell you exactly which lines.
