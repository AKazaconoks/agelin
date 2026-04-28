# agelin static scan — 97 popular public subagents

> Drafted at end of cycle 2 (post unknown-tool fix). Final numbers will
> be updated after cycle 5 with the full benchmark leaderboard.

## TL;DR

Ran `agelin check` against the top 97 public Claude Code subagents
scraped from VoltAgent, 0xfurai, lst97, and iannuttall. **No model calls,
no API key, no money.** Static analysis only — 32 rules.

- **Mean score: 65.9 / 100**
- **Median: 68**
- **Range: 5 — 94**

(Numbers updated post cycle-2 batch: 12 new context-aware rules now
catch tool-body mismatches, undefined output contracts, missing input
preconditions, role contradictions, unresolved cross-references,
broken numbered lists, hardcoded user paths, and stale model refs.)

## Four facts that should worry every Claude Code user

### 1. 14% of popular subagents fail basic frontmatter parsing.

14 of 97 agents have malformed YAML frontmatter — they won't load
correctly in Claude Code. The names show up as `(unnamed)` because
parsing died before reaching the `name` field.

### 2. 52% can edit code but never tell themselves to verify it.

Half of all subagents declare `Write` / `Edit` / `Bash` permissions
but their system prompts never mention running tests, linting, or
type-checking. They mutate code and call it done.

### 3. 64% have no worked example.

Long-form prompts that describe a job in prose with no concrete
input → output example. The model has to infer the deliverable
shape from the role description alone.

### 4. 35% market themselves with hype clichés in the description.

"Expert in", "comprehensive", "specialist in", "10x", "world-class".
Claude Code routes on what an agent **does**, not adjectives — so
these descriptions waste the routing field.

## Top 5

| Rank | Agent | Score | Repo |
|---|---|---:|---|
| 1 | `cassandra-expert` | 96 | 0xfurai/claude-code-subagents |
| 1 | `cockroachdb-expert` | 96 | 0xfurai/claude-code-subagents |
| 1 | `angular-architect` | 96 | VoltAgent/awesome-claude-code-subagents |
| 1 | `javascript-pro` | 96 | VoltAgent/awesome-claude-code-subagents |
| 1 | `nextjs-developer` | 96 | VoltAgent/awesome-claude-code-subagents |

## Bottom 5 (named)

| Rank | Agent | Score | Why |
|---|---|---:|---|
| 97 | `performance-engineer` | 8 | multiple parse errors + missing description |
| 96 | `frontend-developer` | 16 | redacted-for-now |
| 95 | `postgresql-pglite-pro` | 21 | redacted-for-now |
| 94 | `ux-designer` | 22 | redacted-for-now |

(Several agents lower than these are unnamed because parsing failed.)

## Per-rule firing rate on 97 wild agents (32 rules, sorted by frequency)

```
tool-body-mismatch              246 occurrences (avg 2.5 per agent)
missing-input-preconditions      91 / 97 (94%)  - input contract missing
no-examples                      62 / 97 (64%)
tools-as-string-not-array        60 / 97 (62%)
verbosity-encouraged             59 / 97 (61%)
undefined-output-shape           58 / 97 (60%)  - output contract missing
no-verification-step             50 / 97 (52%)
no-negative-constraints          35 / 97 (36%)
description-uses-cliche          34 / 97 (35%)
parse-error                      14 / 97 (14%)
unbounded-retry                  11 / 97 (11%)
prompt-too-long                   7 / 97 ( 7%)
frontmatter-description-missing   7 / 97 ( 7%)
code-block-no-language            5 / 97 ( 5%)
no-exit-criteria                  5 / 97 ( 5%)
tool-list-too-broad               3 / 97 ( 3%)
frontmatter-name-mismatch         3 / 97 ( 3%)
tool-overreach                    3 / 97 ( 3%)
```

**Highlights:**
- `tool-body-mismatch` (NEW) — fires on average 2.5x per agent: tools are
  declared in frontmatter but the body neither names them nor uses any
  implicit-usage verb (read/edit/run/etc).
- `undefined-output-shape` (NEW) — 60% of agents never specify what shape
  their output should take. Models guess at deliverable structure and
  produce inconsistent results.
- `missing-input-preconditions` (NEW) — 94% of agents never state what
  inputs they expect. Callers can't tell what to pass.

(`unknown-tool` at 150 occurrences in an earlier draft turned out to be
100% false positives: real Claude Code tools we hadn't whitelisted plus
valid MCP-server tools using the `mcp__<server>__<tool>` convention.
Fixed before publishing.)

## What we did not measure (yet)

This scan is **static-only**. It tells you whether a subagent is
**well-formed**. It does not tell you whether the subagent **actually
solves problems**.

The full picture comes from `agelin bench` — running the agent
against a golden task suite (8 production-shaped problems) and scoring
its actual output. Cycle 4-5 will produce that leaderboard.

## How to reproduce

```bash
git clone https://github.com/<owner>/agelin
cd agelin
npm install
npm run fetch-targets   # downloads the 97 public agents
npx tsx src/cli.ts check ./targets/ --format=json > scan.json
```

Zero API calls, zero dollars. Static rules only.
