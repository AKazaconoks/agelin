# HN post drafts (3 variants)

Pick one for launch. Each draft is the *body* — the title goes in the HN title field.

---

## Draft A — "Wolves in sheep's clothing" (recommended after cycle 5)

**HN title (pick ONE):**

> Show HN: 97 popular Claude Code subagents scanned. 3 are wolves in sheep's clothing.

> Show HN: I scanned 97 popular Claude Code subagents. Median scored 68/100.

> Show HN: agelin — 32 rules + a free benchmark for Claude Code subagents.

**Body (post first comment in the thread):**

I built `agelin`: an ESLint-style static analyzer + benchmark harness
for Claude Code subagents (the `.claude/agents/*.md` files that route
specialized sub-jobs).

I scanned 97 of the most-popular public subagents from VoltAgent, 0xfurai,
lst97, and iannuttall. Then I ran 24 of them against a 12-task benchmark
suite and crossed the two scores. Three findings:

**1. Static signal alone catches a lot.**

Of 97 wild agents:
- 14% have malformed YAML frontmatter — they won't even load in Claude Code.
- 94% have no input contract — the body never tells callers what to pass in.
- 60% have no output contract — the model guesses at deliverable shape.
- 52% can edit code (Write/Edit/Bash declared) but never tell themselves to
  run tests or lint.
- 35% lead with hype clichés ("expert in", "world-class", "comprehensive")
  in the description field that Claude Code uses for routing.

Mean score 65.9 / 100. Median 68. Range 5–94.

**2. But static signal isn't the whole truth.**

When I ran 24 of them against the bench suite (SQL injection in PHP, data
race in Go, OOM kill diagnosis, daily-interest off-by-one, JS Date
timezone bug, cache stampede, etc.), four quadrants emerged:

| Quadrant | n | Mean static | Mean bench | What it means |
|---|---:|---:|---:|---|
| high static / high bench | 12 | 87.8 | 82.6 | legit good |
| **high static / low bench** | **3** | **87.3** | **69.7** | **wolves in sheep's clothing** |
| **low static / high bench** | **1** | **45.0** | **81.2** | **diamond in the rough** |
| low / low | 8 | 47.8 | 66.6 | genuinely broken |

The three wolves: `c-expert` (static 88, bench 73.6), `bash-expert` (86 /
72.9), `ava-expert` (88 / 62.5). Pass the linter, fail real tasks.

The lone diamond: `architect-reviewer` (45 / 81.2). Frontmatter is messy
— parse warnings, missing fields, comma-string tools list — but the body
content solves problem after problem. The linter undersold it.

This is the strongest argument for running both static AND bench — neither
alone is the truth.

**3. The benchmark is free.**

I had $0 in API credits. By routing the bench through the local `claude`
CLI subprocess instead of the Anthropic API directly, anyone with a Claude
Code Max plan can run it for $0 — flat-rate Max-plan tokens instead of
incremental API charges. Cycle 5's full 24-agent × 12-task run took 1h
20m and zero dollars.

Source: github.com/<owner>/agelin

```
npx agelin check ./targets/        # 3-second static scan
npx agelin bench ./agents/         # benchmark, free with Max plan
```

---

## Draft B — "The story" framing

**HN title:**

> Show HN: I built a linter for Claude Code subagents after my own kept hallucinating

**Body:**

A few months ago I was building a Claude Code agent for trading
backtests. It worked great in dev, but in production it kept inventing
tool names, ignoring my constraints, and silently failing without
telling me what it had tried. I wrote 200 lines of debug logging before
realizing the problem was the agent prompt itself: I'd copied a tools
list from another agent without thinking, and the body never told the
agent to verify its work.

Turns out 50%+ of popular public subagents have the same problem.

`agelin` is what I wish had existed then — a static analyzer
that catches the patterns I learned the hard way:

- Tools declared in frontmatter that the body never references
- Roles that contradict the tool list ("review only" + Edit + "apply the fix")
- No input contract (94% of agents)
- No output contract (60%)
- Tool names that don't exist in Claude Code (oh wait, actually they
  almost all DO exist as MCP tools — that one took a refactor)

It's static, free, deterministic — `agelin check` runs in 3
seconds on 97 agents. There's also a benchmark harness that runs each
subagent against a golden task suite, scored against an assertion. The
benchmark works against an Anthropic API key OR through the local
`claude` CLI subprocess if you have a Max plan, which is free.

Repo, install, examples: github.com/<owner>/agelin

---

## Draft C — "Receipts first"

**HN title:**

> Show HN: agelin — 32 rules and a benchmark for Claude Code subagents

**Body:**

`agelin check` against 97 popular subagents from VoltAgent /
0xfurai / lst97 / iannuttall:

```
Mean: 65.9   Median: 68   Range: 5-94

Top 5 (96/100): cassandra-expert, cockroachdb-expert,
                angular-architect, javascript-pro, nextjs-developer
Bottom: performance-engineer (8/100, multiple parse errors)

Rule firings on the population:
  tool-body-mismatch              246 (avg 2.5/agent)
  missing-input-preconditions      91/97 (94%)
  no-examples                      62/97 (64%)
  tools-as-string-not-array        60/97 (62%)
  verbosity-encouraged             59/97 (61%)
  undefined-output-shape           58/97 (60%)
  no-verification-step             50/97 (52%)
  description-uses-cliche          34/97 (35%)
  parse-error                      14/97 (14%)  - won't load in Claude Code
```

It also runs a benchmark harness against a golden task suite (8 tasks ->
13 in the latest), scoring real model output. Free locally via the
`claude` CLI subprocess if you have a Max plan — no API key required.

What it ships:
- 32 rules (12 context-aware, including markdown AST tokenizer)
- `--fail-on=error|warning|suggestion|none` for CI
- `agelin diff` for tracking score deltas across PRs
- GitHub Action template
- shields.io-compatible badge generator

Repo: github.com/<owner>/agelin

Happy to discuss the calibration loop (5 cycles of bench-then-tune-then-
benchmark-again) and where the rules came from.

---

## Submission notes (for the user)

**Best window:** Tuesday-Wednesday 9-10 AM US ET. Avoid Mondays
(post-weekend backlog buries new posts) and Fridays (low engagement).

**First-comment self-reply (any draft):** post 30 seconds after submission
with the most-detailed methodology / data link. HN's algorithm rewards
threaded engagement.

**Pre-launch DMs (timing):** send 18-24 hours before, NOT day-of.
Authors will be in different time zones.

**Don't post to Reddit r/programming first** — they downvote anything
that hits HN later. Reddit is a follow-up 24-48 hours after HN settles.
