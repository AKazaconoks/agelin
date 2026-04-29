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

Or **try the browser playground** — paste an agent, see its score and per-issue fix-its, no install required:
[https://akazaconoks.github.io/agelin/playground.html](https://akazaconoks.github.io/agelin/playground.html). Runs the same 34 rules client-side; nothing leaves your browser.

## Does it actually move the needle?

We took **3 popular Claude Code subagents** from the wild, applied agelin's recommendations to each, and re-ran them against **20 high-vote questions pulled verbatim from StackOverflow** (3 agents × 20 tasks × 3 repeats = 180 calls per side, 360 total).

Headline:

| | Before | After | Δ |
|---|---|---|---|
| Static score (mean of 3 agents) | 67.3 | **100** | +32.7 |
| Bench timeouts (>60–90 s) | 43 | **27** | **−37%** |
| Mean wall time per call | 51.7 s | 47.6 s | **−7.84%** |
| LLM-judge total (Sonnet 4.6, 5 dims, 0–100) | 96.06 | 95.97 | ~tied |
| Strict pass rate | 52.8% | 57.8% | +5% |
| Loose-semantic pass rate | 96.1% | 96.7% | ~tied |

The honest read: agelin's fixes don't make agents *smarter* on these questions (a Sonnet-4.6 grader scores both before and after at ~96/100, the rubric's "textbook-correct" anchor). They make agents **tighter** — `verbosity-encouraged` + `description-uses-cliche` + `undefined-output-shape` cut token waste enough that the agents stop busting time budgets and respond ~8% faster on average. Two of three case-study agents got materially faster (`bash-expert` 17.6%, `electron-pro` 13.1%); one regressed on speed (`full-stack-developer` −5.3%) — full per-agent breakdown in the case-study README.

Full data, every diff, every assertion: **[`case-study/README.md`](./case-study/README.md)**. To automate the same workflow on any subagent of yours, see the [`subagent-enhancer`](./templates/subagent-enhancer.md) template.

## What you get

**Frontmatter hygiene.** Rules that flag the subagents that simply will not load: missing `description`, name/filename mismatch, comma-separated `tools` strings instead of YAML arrays, references to retired Claude model IDs. In our scan of 97 popular public subagents, **14% failed basic frontmatter parsing** — the names show up as `(unnamed)` because the parser dies before reaching `name`.

**Body structure.** Long-form prompts are where most quality is lost. We catch prompts that are too short to specify anything (under 50 tokens), too long to keep attention (over 2000), missing worked examples (64% of wild subagents), missing input preconditions (94%), missing output-shape contracts (60%), or written as tutorials that teach the user instead of instructing the agent.

**Behavior safety.** The expensive failure modes. `tool-overreach` flags read-only descriptions paired with `Write` / `Edit` / `Bash` permissions. `cost-bomb` flags recursive subagent fan-out without a budget. `unbounded-retry` flags retry loops with no numeric cap. `injection-vector` flags `$ARGUMENTS` interpolation without quoting. `no-verification-step` fires when an agent can mutate code but never tells itself to run the tests — **52% of wild subagents** edit code and then declare done.

**Contracts.** A subagent without a contract drifts. We catch tools declared in frontmatter but never used in body prose (avg **2.5x per agent** in the wild scan), description fields padded with hype clichés instead of trigger conditions ("expert in", "10x", "world-class" — 35% of agents), unresolved cross-references to other agents that the Task tool isn't authorized to invoke, and exit phrases that terminate in vague adverbs ("until satisfied", "as appropriate") with no concrete predicate.

Across the 97-agent baseline, the mean score landed at **65.9 / 100** — median 68, range 5 to 94. Plenty of room to move.

## `check` is free; `bench` is the optional dynamic eval

The 34-rule **static analyzer** (`agelin check`) needs zero LLM. No API key, no CLI subscription — it runs against the markdown directly. That's where ~95% of the value is and what every CI integration uses by default.

The optional **dynamic benchmark** (`agelin bench`) actually runs each subagent against a golden task suite. Two backends:

| Backend       | Compatible with                              | Requires                                          | Flag                    |
| ------------- | -------------------------------------------- | ------------------------------------------------- | ----------------------- |
| `api`         | Any Anthropic API account (Build / Scale / Enterprise / pay-as-you-go) | `ANTHROPIC_API_KEY` env var      | `--backend=api`         |
| `claude-code` | Claude Pro **or** Claude Max subscription    | `claude` CLI on PATH (authenticated)              | `--backend=claude-code` |

The default `--backend=auto` prefers `claude-code` when the `claude` CLI is on PATH and `ANTHROPIC_API_KEY` is missing — anyone with a Pro or Max subscription can run the benchmarks at no per-token cost.

```bash
# Flat-rate (Pro or Max): routes through your local `claude` CLI
npx agelin bench ./.claude/agents/ --backend=claude-code

# Pay-per-token (API): direct Messages API
export ANTHROPIC_API_KEY=sk-ant-...
npx agelin bench ./.claude/agents/ --backend=api --model=claude-sonnet-4-6
```

**Non-Anthropic models** (OpenAI / Gemini / local Ollama) are **not supported today**. The `Backend` interface in `src/eval/backends/index.ts` is shaped for swap-in implementations, but each model family needs ~3-5 days of work to translate its tool-use loop, pricing table, and retry semantics. On the roadmap; not in 0.x.

The `claude-code` backend has two trade-offs vs. the API backend: spawned tool calls execute with Claude Code's real permissions (not our tmpdir sandbox), and per-tool-call counts aren't exposed by `claude -p --output-format json` yet — so `tool-called` / `no-tool-called` assertions are unreliable there. See `src/eval/backends/claude-code.ts` for the full list.

## Rule reference

All 34 rules with severities, descriptions, and example fix-it messages: [`docs/rules.md`](docs/rules.md). Auto-generated from `src/rules/*.ts` — regenerate with `npm run docs:rules`.

## Sample output

Multi-agent scan — compact summary:

```
$ npx agelin check ./.claude/agents/
⚠ build-validator           Score: 90  (undefined-output-shape, missing-input-preconditions)
⚠ code-block-no-lang-positive  Score: 86  (no-negative-constraints, tool-body-mismatch, +3 more)
✗ code-fixer                Score: 23  (no-exit-criteria, no-negative-constraints, +4 more)
✗ security-auditor          Score: 29  (tool-overreach, vague-pronouns, +2 more)

4 agents checked, 18 issues across 4 agents (2 critical)

  Some issues are auto-fixable. Run `agelin fix <path>` to apply, or `agelin fix <path> --dry-run` to preview.
  Run with --verbose to see the message and fix for each issue.
```

Single-agent scan — auto-verbose layout (also via `--verbose`):

```
$ npx agelin check ./.claude/agents/security-auditor.md
✗ security-auditor  Score: 29

  [error]     tool-overreach
    description claims read-only review but tools include Edit, Bash.
    fix: Remove Edit/Bash from `tools`, or update the description to say it can apply fixes.

  [warning]   vague-pronouns
    body uses hand-wavy phrases like "the appropriate tool" without specifying which one.
    fix: Replace each vague pronoun with the concrete tool/file/argument the agent should use.

1 agent checked, 2 issues across 1 agent (1 critical)
```

Each agent is scored 0–100 by subtracting weighted penalties from a clean baseline (errors -25, warnings -8, suggestions -2). Full per-rule output is available with `--format=json` for piping into other tools.

## Documentation

- [`docs/principles.md`](docs/principles.md) — five principles distilled from 97 wild agents
- [`docs/migration-guide.md`](docs/migration-guide.md) — fixing a low-scoring agent, ordered by score impact
- [`docs/rules.md`](docs/rules.md) — all 34 rules with severities, fix-it messages, and source links (auto-generated)
- [`docs/ci-recipes.md`](docs/ci-recipes.md) — copy-paste GitHub Actions / GitLab / pre-commit / CircleCI integrations
- [`templates/`](templates/) — three drop-in starter agents that score 100/100 (or 98/100)

## How it differs from `cclint`

[`cclint`](https://github.com/carlrannaberg/cclint) validates that your subagent file is *valid* (frontmatter parses, naming conventions match). `agelin` checks if the subagent is *good* (catches failure patterns, runs it against benchmarks, produces a comparable score).

The two are complementary — run cclint to make sure it's well-formed, run agelin to make sure it works.

## Auto-fix

Four rules have safe auto-fixes today:

```bash
npx agelin fix ./.claude/agents/            # writes in place
npx agelin fix ./.claude/agents/ --dry-run  # preview without writing
```

| Rule                          | Fix                                               |
|-------------------------------|---------------------------------------------------|
| `tools-as-string-not-array`   | rewrite comma-string → YAML array                 |
| `code-block-no-language`      | insert `text` lang tag on bare ``` fences         |
| `malformed-list`              | renumber 1..N preserving indent + marker          |
| `hardcoded-paths`             | replace `/home/<u>/`, `/Users/<u>/`, `C:\Users\<u>\` with `~/` (placeholder names and code blocks left alone) |

A fix lands here only when there's exactly one reasonable answer. Rules that need a judgment call (e.g. `stale-model-versions` — `claude-3-opus` could map to either Sonnet 4.6 or Opus 4.7) print the suggestion in the message but don't auto-apply.

## Configuration

Drop an `agelin.config.json` in your repo root. Three composable layers:

```json
{
  "extends": "agelin:strict",
  "plugins": ["./internal-rules.js", "@my-org/agelin-rules"],
  "rules": {
    "no-examples": "off",
    "my-org/no-internal-jargon": "error"
  }
}
```

**Presets (`extends`).** `agelin:recommended` is the implicit default — every rule at its `defaultSeverity`. `agelin:strict` bumps each rule up one notch (suggestion → warning, warning → error). Multiple presets compose left-to-right.

**Plugins (`plugins`).** Module specifiers — relative paths or bare-package names. Each plugin default-exports `{ name, rules }`; rule ids get auto-namespaced as `<plugin-name>/<rule-id>` so two plugins (or a plugin and a built-in) can never collide. Plugin rules participate fully in `extends` and `rules`.

```js
// internal-rules.js
export default {
  name: "my-org",
  rules: [
    {
      id: "no-internal-jargon",
      defaultSeverity: "warning",
      description: "Don't use internal jargon in subagent prompts.",
      check(subagent) {
        if ((subagent.body || "").match(/\bblerg\b/i)) {
          return [{ ruleId: "no-internal-jargon", severity: "warning",
                    message: "body uses internal jargon" }];
        }
        return [];
      }
    }
  ]
};
```

**Per-file overrides (inline directives).** Suppress a rule for a single line, a block, or the rest of the file:

```md
<!-- agelin-disable-next-line no-examples -->
This agent intentionally has no examples.

<!-- agelin-disable no-negative-constraints, prompt-too-short -->
... permissive section ...
<!-- agelin-enable -->
```

Whole-agent rules (those that emit issues without a line number) are suppressed by any block disable that names them.

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

0.2.0. The 34 static rules are calibrated against a 97-agent corpus; four of them have safe auto-fixes. The benchmark harness is functional but the golden task suite is still expanding. Public API (the named exports above) follows semver; the `bench` surface is not yet exported programmatically and may change.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the rule-authoring contract, calibration loop, and how to add a new rule. The agent-team workflow (orchestrator + workers) is documented in [`AGENTS_CONTRACT.md`](AGENTS_CONTRACT.md).

## License

MIT
