# I scanned 97 popular Claude Code subagents. Here's what I found.

*A long-form companion to the launch tweet thread / HN post. Suitable
for personal blog, dev.to, Medium, or LinkedIn.*

---

A few months ago I built a Claude Code agent that ran my crypto trading
backtests. It worked great in dev. In production, it kept silently
failing — inventing tool names, ignoring my constraints, declaring
"done" without verifying anything actually worked.

I assumed I'd written a bad agent. So I went looking at popular public
agents to learn from them. After reading 30+, I had a different
hypothesis: most subagents in the wild have the same failure modes I
did. Nobody calls them out because there's no objective signal.

So I built one.

## What I built

[**`agelin`**](https://github.com/<owner>/agelin) is a
static analyzer + benchmark harness for `.claude/agents/*.md` files.

Two layers:

1. **Static analyzer** — 32 rules, ~3 seconds on 100 agents. Like
   ESLint for subagents.
2. **Benchmark harness** — runs each subagent against a golden task
   suite, scores actual problem-solving. Free if you have a Claude
   Code Max plan; routes through the local `claude` CLI subprocess
   instead of the API.

I scanned 97 of the most-popular public subagents, scraped from
VoltAgent, 0xfurai, lst97, and iannuttall. Here's what I found.

## Five facts about wild Claude Code subagents

### 1. 14% won't even load.

14 of 97 agents have malformed YAML frontmatter. Claude Code can't
parse them. Most are stuffed `<example>` tags inside the description
field, which contains a colon, which terminates the YAML value early.

Easiest fix in the world: quote the description value. Doesn't matter
how good the agent body is if Claude Code can't load the agent.

### 2. 94% don't tell you what input to send.

Of the 83 well-formed agents, only 2 had an explicit `## Inputs`
section. Every other one expected the caller to figure out what to
pass — file paths? Git diffs? Pasted code? Some combination?

Subagents are functions. Functions need signatures.

### 3. 60% don't tell you what output to expect.

Same shape, output side. The model is left to guess at deliverable
structure on every invocation. Get a JSON object on Monday, a markdown
report on Tuesday.

### 4. 52% can mutate code but never tell themselves to verify.

Agents that declare `Write` / `Edit` / `Bash` permissions but whose
prompt body never instructs the agent to run tests, lint, or build.
They mutate, declare done, the user discovers the breakage in CI
later.

This is the rule called `no-verification-step` and it fires on more
than half the population.

### 5. 35% sell themselves with hype clichés.

"Comprehensive", "expert in", "world-class", "10x", "best-in-class".
Claude Code's router reads the `description` field to decide which
agent to invoke. Adjectives don't help the router. Trigger conditions
do: *"Use when the user asks to design a REST endpoint."*

## How the linter works

Each rule is a small TypeScript function that takes a parsed subagent
and returns zero or more issues. There are three categories:

### Frontmatter rules (the easy ones)

`tools-as-string-not-array`, `frontmatter-name-mismatch`,
`description-uses-cliche`, `tool-list-too-broad`. Pure pattern matching
on the YAML frontmatter. Fast, deterministic.

### Body-text rules (still pattern matching, with care)

`no-exit-criteria`, `injection-vector`, `role-play-bloat`,
`hardcoded-paths`, `stale-model-versions`. These scan the markdown
body for patterns. The interesting work was in *negative* matching: a
rule that says "the body must contain a constraint" needs to recognize
both "do not modify" and "only edit the file in question" as valid.

### Cross-section rules (the new ones)

`tool-body-mismatch`, `contradictory-role-capability`,
`undefined-output-shape`, `missing-input-preconditions`,
`unresolved-cross-references`. These compare frontmatter against body,
or look for structural patterns in the markdown AST.

To make context-aware checks fast, I hand-rolled a 150-line markdown
tokenizer instead of pulling in `remark-parse` + `unified` (~150 KB,
adds 200 ms startup). Total cost for the AST: ~10 ms across 97 agents.
The whole `agelin check` command runs in 3 seconds.

## Why static analysis isn't enough

Static rules find well-formedness issues. They don't tell you whether
the subagent **actually solves problems**. For that, I added a
benchmark harness.

It runs each subagent against a golden task suite — 13 production-
shaped problems including:

- Find the SQL injection in this PHP file.
- Identify the data race in this Go code.
- Diagnose the OOM kill from this dmesg snippet.
- Spot the off-by-one in a daily-interest accrual loop.
- Reconcile a stack trace with deploy config to find a timezone bug.

Each task has an assertion (regex, JSON-path, contains, etc.) that
checks whether the model's output identifies the right root cause AND
proposes a remediation. Two-axis assertions force "real diagnosis"
rather than just keyword matching.

I ran four cycles of bench-then-tune-then-rebench on the 5 most
popular VoltAgent agents. Findings from cycle 1: the dominant failure
mode wasn't bad answers — it was duration timeouts. Models gave perfect
answers but took 90 seconds when the budget was 60. Cycle 2 raised
budgets and the pass rate jumped from 43% to 94%. Cycle 3 broadened
the agent set. Cycle 4 added 5 harder tasks (subtle SQLi, off-by-one,
cache stampede, etc).

## The free benchmark trick

The benchmark needs to run real models. I had $0 in API credits. I
have a Max plan.

The wedge: route through the local `claude` CLI subprocess instead of
the Anthropic API directly. Anyone with a Max plan can run the
benchmark for $0. It uses your flat-rate Max-plan tokens, no
incremental cost.

This took some debugging. The CLI's `--bare` flag forces
ANTHROPIC_API_KEY-only auth (no good — that's what we're trying to
avoid). On Windows, spawn EINVAL'd because Node was looking for
`claude.cmd` while the binary ships as `claude.exe`. The CLI reports
`total_cost_usd` even when you're on a flat-rate plan, which would
have failed every run against the per-task cost ceiling — so the
backend zeros out the cost field.

Each fix is a 5-line commit. The integration is a 200-line file. But
the result is a benchmark that anyone with a Max plan can run for $0,
which is the difference between "interesting hobbyist tool" and
"thing that could ship as part of a CI pipeline".

## What's next

The repo is at `github.com/<owner>/agelin`. It ships:

- 32 rules
- The benchmark harness with 13 tasks
- A GitHub Action template that comments on PRs touching subagents
- Three drop-in templates that score 100/100 on our own ruleset
- Per-rule documentation
- A migration guide for fixing low-scoring agents
- A "five principles" cheat sheet

The next thing I want to add: a **agelin.dev** hosted leaderboard
that auto-scans top public repos weekly and shows trend lines per
agent. If you maintain a popular subagent repo and want first dibs on
your agents getting onto the leaderboard, DM me.

If you maintain your own `.claude/agents/`, install:

```
npm install -g agelin
agelin check ./.claude/agents/
```

Most users see scores in the 50-80 range on first run. The
`docs/migration-guide.md` walks through the highest-leverage fixes —
descriptions are usually the biggest jump (10-15 points), then input
contracts (8 points), then trimming kitchen-sink tool lists.

Drop me a note if you find a false positive or miss a pattern. The
rule registry is intentionally narrow — every rule was added based on
a real failure I (or the wild population) had observed. There are
patterns we don't yet catch because I didn't have a fixture for them.
File an issue.

---

*Tools used: TypeScript, Bun, the Claude Code CLI, the Anthropic SDK,
gray-matter for YAML, kleur for terminal colors. No external markdown
parser — hand-rolled. No external assertion library — hand-rolled.
Total dependency count: 4. Total LOC: ~6000.*
