# Migration guide: fixing a low-scoring subagent

You ran `agelin check` and got 40/100. Now what?

This guide walks through the highest-leverage fixes ordered by typical
score impact. Real before/after examples from the wild population.

---

## Triage: read the rule list, group by severity

Errors first (each costs 25 points), then warnings (8), then
suggestions (2). A single error fix can move you 25 points.

```bash
agelin check ./your-agent.md --format=json | jq '.results[].staticIssues'
```

---

## Top-impact fix: malformed frontmatter (parse-error)

If your agent shows up `(unnamed)` or has a `parse-error` issue, the
YAML frontmatter is malformed. Claude Code can't load this agent at
all.

Common causes:

```yaml
# WRONG: unquoted colon in description
description: Use when: the user asks for X

# RIGHT: quote any string containing a colon
description: "Use when the user asks for X — for example: 'review this'"
```

```yaml
# WRONG: tools key has trailing whitespace
tools : Read, Grep

# RIGHT: tight spacing
tools: Read, Grep
```

```yaml
# WRONG: example block at top of frontmatter
---
description: Use this agent when... <example>
Context: ...
</example>
---

# RIGHT: <example> tags belong in the body, not frontmatter
---
description: Use when the user asks for X.
---

# Body
[example tags here]
```

**Score impact:** parse-error is `error` severity → ~25 points.

---

## High-impact: state the trigger condition (description-too-vague,
description-uses-cliche, description-uses-examples-instead-of-summary)

The `description` field is what Claude Code reads to decide whether to
route a request to your agent. If it's vague, full of hype, or stuffed
with `<example>` tags, the router has nothing to match against.

### Before (low-score, 86)

```yaml
description: "Write expert Django code with optimized models, views, and
templates. Handles complex queries, middleware, and RESTful APIs. Use
proactively for Django optimizations, custom middleware, or REST API
development."
```

(Real example from `django-expert` in 0xfurai/claude-code-subagents.)

This trips:
- `description-uses-cliche` — "expert" is a hype word
- `description-too-vague` — no concrete trigger
- (warning level)

### After (clean)

```yaml
description: "Use when the user asks to design or refactor a Django app:
optimize ORM queries, build a Django REST Framework API, write custom
middleware, or scale Django services. Examples: 'optimize this Django
view', 'add a JWT auth middleware'."
```

**Score impact:** +10 to +15 (drops 1 warning + 1 suggestion).

---

## High-impact: add an input contract (missing-input-preconditions)

94% of wild agents fail this. Add an `## Inputs` section.

### Before (any wild agent)

```markdown
You are a senior backend engineer.

## Workflow

1. Look at the code
2. Find issues
3. Suggest fixes
```

### After

```markdown
You are a senior backend engineer.

## Inputs

You will be given:
- A path to a single source file, OR
- A unified-format git diff
- An optional language hint if the project uses multiple stacks

If the input is unclear, ask one specific clarifying question and stop.

## Workflow
...
```

**Score impact:** +2 (suggestion).

---

## High-impact: add an output contract (undefined-output-shape)

60% of wild agents fail this. Add an `## Output` section.

### Before

```markdown
## Workflow

1. Read the diff
2. Identify problems
3. Suggest fixes
```

### After

```markdown
## Workflow

1. Read the diff
2. Identify problems
3. Suggest fixes

## Output

Return a markdown report with this structure:

- `## Critical` — bugs that will cause incorrect behavior
- `## Important` — issues that affect maintainability
- `## Nits` — style or formatting suggestions

Each finding: file:line + one-sentence diagnosis + a 3-5 line diff fix.
```

**Score impact:** +8 (warning).

---

## Medium-impact: trim the tools list (tool-body-mismatch, tool-list-too-broad, tool-overreach)

If you declared 6 tools and the body talks about reading code, drop the
write tools.

### Before

```yaml
tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, Task
```

(Body says: "review the file and report findings." — never writes,
never executes anything.)

### After

```yaml
tools:
  - Read
  - Grep
```

**Score impact:** +2 to +6 (1 suggestion per dropped unused tool, plus
removes the `tool-list-too-broad` warning).

---

## Medium-impact: add verification step (no-verification-step)

If the agent has Write/Edit/Bash, the body must say "run tests" or "lint".

### Before

```markdown
## Workflow

1. Read the code
2. Apply fixes
3. Done
```

### After

```markdown
## Workflow

1. Read the code
2. Apply fixes via `Edit`
3. Run `npm test` and verify it passes
4. If tests fail: revert, re-analyze, retry up to 3 times
5. Report final status
```

**Score impact:** +8 (warning).

---

## Lower-impact: add constraints (no-negative-constraints)

Either negative ("do not") or positive ("only X") constraints. Caught
by `no-negative-constraints` (warning).

### Before

```markdown
You are a code reviewer. Review the code and report issues.
```

### After

```markdown
You are a code reviewer.

## Constraints

- Only modify the file under review; never edit dependencies or configs.
- Do not run shell commands.
- Limit the review to issues you can prove with the supplied content;
  speculation about unseen code is out of scope.
```

**Score impact:** +8 (warning).

---

## Lower-impact: replace hype with concrete behavior (role-play-bloat)

If your body opens with "You are a 10x engineer with 15 years..." or
similar, swap it for a concrete job description.

### Before

```markdown
You are a world-class senior backend engineer with 20+ years of
experience in distributed systems and microservices architecture...
```

### After

```markdown
You are a backend code reviewer. You read TypeScript and Python diffs
and find logic bugs, performance issues, and security gaps. You always
suggest a concrete fix — not just "this could be better".
```

**Score impact:** +2 (suggestion).

---

## Common mistakes that DON'T fire rules but should

Patterns we don't yet catch but you should still avoid:

- **Mega-prompts (5000+ tokens) split into 30 sections.** No model can
  follow that. We catch >2000 tokens (`prompt-too-long`) but the
  signal-to-noise breakdown happens earlier.
- **Conflicting instructions in different sections.** "Be concise" in
  one section and "Provide comprehensive analysis" in another. The
  model averages them.
- **Tools declared but the body delegates to a different tool name
  later.** The body says "use Glob" but `tools: Read, Grep`. Glob is
  unavailable. The agent invents a way to fake it.

---

## After all the fixes: the target

A 95+/100 agent has all of:

1. Description with `Use when X. Examples: ...`
2. Tools list matching the body's verbs (no kitchen sink)
3. `## Inputs` section
4. `## Workflow` with numbered steps
5. `## Constraints` with "do not" / "only" rules
6. `## Output` section with deliverable shape
7. Verification step in the workflow if you can mutate code
8. Concrete completion criterion (not "until satisfied")
9. No hype clichés
10. Worked example if the prompt is over 300 tokens

Look at `templates/code-reviewer.md` (100/100) for a clean reference.
