# agelin

> Static analysis + benchmark harness for Claude Code subagents. Like ESLint, but it tells you if the subagent actually works.

[![npm version](https://img.shields.io/npm/v/agelin?color=blue)](https://www.npmjs.com/package/agelin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Catch failure patterns before you copy a stranger's `.md` file into `.claude/agents/`. Score each subagent 0–100 on a deterministic, model-free rubric, then (optionally) run it against a golden task suite to see if it actually solves problems.

## The problem

Wild Claude Code subagents are everywhere. VoltAgent, 0xfurai, lst97, iannuttall — three or four community repos alone hold 15k+ stars worth of agents that anyone can drop into `.claude/agents/`. **Quality is invisible.** Stars measure popularity, not whether the subagent runs the tests it just edited, or whether it spirals into infinite retry loops, or whether it has `Bash` + `Write` permissions when its description says "read-only auditor".

There is no objective signal. `agelin` is the missing one: a 34-rule static analyzer plus a benchmark harness that scores every subagent on the same axis.

## Quickstart

```bash
# Static analysis — no API key, no money, runs in milliseconds.
npx agelin check ./.claude/agents/

# Dynamic eval — runs each subagent against a golden task suite.
npx agelin bench ./.claude/agents/

# Sweep an entire directory of public subagents into a leaderboard.
npx agelin baseline --targets=./targets
```

## What you get

**Frontmatter hygiene.** Rules that flag the subagents that simply will not load: missing `description`, name/filename mismatch, comma-separated `tools` strings instead of YAML arrays, references to retired Claude model IDs. In our scan of 97 popular public subagents, **14% failed basic frontmatter parsing** — the names show up as `(unnamed)` because the parser dies before reaching `name`.

**Body structure.** Long-form prompts are where most quality is lost. We catch prompts that are too short to specify anything (under 50 tokens), too long to keep attention (over 2000), missing worked examples (64% of wild subagents), missing input preconditions (94%), missing output-shape contracts (60%), or written as tutorials that teach the user instead of instructing the agent.

**Behavior safety.** The expensive failure modes. `tool-overreach` flags read-only descriptions paired with `Write` / `Edit` / `Bash` permissions. `cost-bomb` flags recursive subagent fan-out without a budget. `unbounded-retry` flags retry loops with no numeric cap. `injection-vector` flags `$ARGUMENTS` interpolation without quoting. `no-verification-step` fires when an agent can mutate code but never tells itself to run the tests — **52% of wild subagents** edit code and then declare done.

**Contracts.** A subagent without a contract drifts. We catch tools declared in frontmatter but never used in body prose (avg **2.5x per agent** in the wild scan), description fields padded with hype clichés instead of trigger conditions ("expert in", "10x", "world-class" — 35% of agents), unresolved cross-references to other agents that the Task tool isn't authorized to invoke, and exit phrases that terminate in vague adverbs ("until satisfied", "as appropriate") with no concrete predicate.

Across the 97-agent baseline, the mean score landed at **65.9 / 100** — median 68, range 5 to 94. Plenty of room to move.

## Two ways to run `bench`

`agelin bench` exercises each subagent against a golden task suite. Two backends:

| Backend         | Bills against             | Requires                              | Flag                    |
| --------------- | ------------------------- | ------------------------------------- | ----------------------- |
| `api`           | Anthropic API console     | `ANTHROPIC_API_KEY` env var           | `--backend=api`         |
| `claude-code`   | Your Claude Code Max plan | `claude` CLI on PATH + a Max plan     | `--backend=claude-code` |

The default `--backend=auto` prefers `claude-code` when the `claude` CLI is available and `ANTHROPIC_API_KEY` is missing — anyone with a Max subscription can run the benchmarks for free.

```bash
# Free (Max plan): routes through your local `claude` CLI
npx agelin bench ./.claude/agents/ --backend=claude-code

# Paid (API key): direct Messages API
export ANTHROPIC_API_KEY=sk-ant-...
npx agelin bench ./.claude/agents/ --backend=api
```

The `claude-code` backend has two trade-offs vs. the API backend: spawned tool calls execute with Claude Code's real permissions (not our tmpdir sandbox), and per-tool-call counts aren't exposed by `claude -p --output-format json` yet — so `tool-called` / `no-tool-called` assertions are unreliable there. See `src/eval/backends/claude-code.ts` for the full list.

## Rule reference

All 34 rules with severities, descriptions, and example fix-it messages: [`docs/rules.md`](docs/rules.md). Auto-generated from `src/rules/*.ts` — regenerate with `npm run docs:rules`.

## Sample output

```
$ npx agelin check ./fixtures/subagents/
⚠ build-validator           Score: 90  (undefined-output-shape, missing-input-preconditions)
⚠ code-block-no-lang-positive  Score: 86  (no-negative-constraints, tool-body-mismatch)
✗ code-fixer                Score: 23  (no-exit-criteria, no-negative-constraints)
✗ postgres-admin            Score: 35  (cost-bomb, role-play-bloat)
⚠ research-agent            Score: 96  (missing-input-preconditions, code-block-no-language)
✗ role-contradiction-positive  Score: 29  (tool-overreach, no-exit-criteria)
✗ security-auditor          Score: 29  (tool-overreach, vague-pronouns)
...

29 agents checked, 29 issues, 4 critical
```

Each agent is scored 0–100 by subtracting weighted penalties from a clean baseline (errors -25, warnings -8, suggestions -2). The console reporter shows the top two firing rules per agent; full per-rule output is available with `--format=json`.

## Documentation

- [`docs/principles.md`](docs/principles.md) — five principles distilled from 97 wild agents
- [`docs/migration-guide.md`](docs/migration-guide.md) — fixing a low-scoring agent, ordered by score impact
- [`docs/rules.md`](docs/rules.md) — all 34 rules with severities, fix-it messages, and source links (auto-generated)
- [`docs/ci-recipes.md`](docs/ci-recipes.md) — copy-paste GitHub Actions / GitLab / pre-commit / CircleCI integrations
- [`templates/`](templates/) — three drop-in starter agents that score 100/100 (or 98/100)

## How it differs from `cclint`

[`cclint`](https://github.com/carlrannaberg/cclint) validates that your subagent file is *valid* (frontmatter parses, naming conventions match). `agelin` checks if the subagent is *good* (catches failure patterns, runs it against benchmarks, produces a comparable score).

The two are complementary — run cclint to make sure it's well-formed, run agelin to make sure it works.

## Programmatic API

```ts
import { lint, ALL_RULES } from "agelin";

const report = await lint("./.claude/agents/");
for (const agent of report.results) {
  console.log(agent.agentName, agent.score, agent.staticIssues.length);
}
```

Stable exports follow semver: `lint`, `parseSubagent`, `parseSubagentDir`, `ALL_RULES`, `getRule`, `computeAgentScore`, `getReporter`, plus all types from [`src/types.ts`](src/types.ts) and the markdown AST from [`src/parser/markdown.ts`](src/parser/markdown.ts). Subpath imports are also supported: `agelin/rules`, `agelin/parser`, `agelin/scoring`, `agelin/reporters`.

## Status

0.1.0. The 34 static rules are calibrated against a 97-agent corpus; the benchmark harness is functional but the golden task suite is still expanding. Public API is semver-stable from this release; the `bench` surface is not yet exported programmatically and may change.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the rule-authoring contract, calibration loop, and how to add a new rule. The agent-team workflow (orchestrator + workers) is documented in [`AGENTS_CONTRACT.md`](AGENTS_CONTRACT.md).

## License

MIT
