# agelin

> Static analysis + benchmark harness for Claude Code subagents. Like ESLint, but it tells you if the subagent actually works.

[![npm version](https://img.shields.io/npm/v/agelin?color=blue)](https://www.npmjs.com/package/agelin)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Catch failure patterns before you copy a stranger's `.md` file into `.claude/agents/`. Score each subagent 0–100 on a deterministic, model-free rubric, then (optionally) run it against a golden task suite to see if it actually solves problems.

---

## What we found

We linted **20 popular community subagents**, applied agelin's recommendations to each, and re-ran them against **5 high-vote StackOverflow questions per agent — all in the agent's stated specialty**. 600 bench cells. Sonnet-4.6 graded every response on a 5-dimension rubric.

| Metric | Before agelin | After agelin | Δ |
|---|---|---|---|
| Static score (mean of 20 agents) | 68.8 | **98.7** | +29.9 |
| Mean response wall time | 57.0 s | **50.8 s** | **−10.78%** |
| Bench timeouts | 91 | **67** | **−26%** |
| Strict bench pass rate | 50.0% | **60.0%** | **+10 pp** |
| **LLM-judge total** (Sonnet 4.6, 5 dims, 0–100) | **82.98** | **86.41** | **+4.14%** |
| **Combined Δ% (judge + time)** | — | — | **+14.92%** |

**16 of 20 agents improved.** All 5 judge dimensions moved up: correctness +4.1%, clarity +3.6%, completeness +4.1%, conciseness +6.5%, technical_accuracy +3.8%.

The honest framing: **agelin is a tightening tool**. It works best when (a) the agent has fat to trim and (b) you ask it questions in its specialty lane. For already-concise specialists, the rules can over-add structure — but agelin 0.5.0 [closed that loophole](./CHANGELOG.md#050--2026-04-29) by adding token-aware skips to the three biggest culprits.

**Reproduce, every diff, every grade:**
- 📊 **Phase 2 (canonical)** — 20 agents × 5 domain-matched questions: **[github.com/AKazaconoks/agelin-case-study](https://github.com/AKazaconoks/agelin-case-study)**
- 📁 Phase 1 (earlier study, generic questions) — 3 agents × 20 questions: [`case-study/`](./case-study/) in this repo

---

## Install

```bash
npm install -g agelin
# or run ad-hoc with npx:
npx agelin check ./.claude/agents/
```

Requires Node ≥ 20. The static analyzer needs nothing else. The dynamic benchmark needs either an `ANTHROPIC_API_KEY` or the `claude` CLI on PATH (Pro / Max subscription).

## Recommended workflow

For each subagent in `.claude/agents/`:

```bash
# 1. Lint statically — free, instant, catches ~95% of issues.
agelin check .claude/agents/my-agent.md

# 2. Apply mechanical auto-fixes (4 rules have safe rewrites).
agelin fix .claude/agents/my-agent.md

# 3. For judgment-based issues (description rewrites, missing examples,
#    inputs/output sections, etc.), use the subagent-enhancer template:
agelin init --template=subagent-enhancer
# then in Claude Code:
@subagent-enhancer .claude/agents/my-agent.md
# It runs agelin check, applies fixes per each rule's advice, re-lints
# until score ≥ 90 (or stops after 3 attempts).

# 4. Optional — validate empirically with the dynamic benchmark.
agelin bench .claude/agents/
```

**Don't use `bench` to fix agents — use it to prove they got better.** The static linter (`check`) is what catches issues. Bench is the empirical follow-up.

---

## Commands

All commands accept a path argument (file or directory). Default path is `./.claude/agents/`.

| Command | What it does | When to use |
|---|---|---|
| `agelin check <path>` | Run all 34 static rules, score 0–100, print issues + fix advice. **Zero LLM, no key needed, runs in milliseconds.** | First thing on any agent. CI default. |
| `agelin fix <path>` | Apply auto-fixes for the 4 mechanical rules; preview with `--dry-run`. | After `check` to clear the easy stuff. |
| `agelin bench <path>` | Run each agent against a golden-task suite, report pass-rate + duration + cost. Backends: `--backend=api` or `--backend=claude-code`. | When you want empirical evidence of quality. |
| `agelin baseline --targets=<dir>` | Sweep a directory of public subagents into a comparable leaderboard. | Comparing communities (lst97 vs VoltAgent vs your own). |
| `agelin diff <baseline.json> <current.json>` | Compare two `--format=json` reports; print rule-firing deltas. | CI check that PRs don't regress. |
| `agelin badge --score=<0-100>` | Emit an SVG status badge to stdout. | README integration. |
| `agelin report` | Read previous `check` JSON output and re-render in a different format. | Convert JSON → markdown for PR comments. |
| `agelin cache (clear\|stats)` | Manage the bench-result cache (skips re-running unchanged agents). | After deleting an agent, before a clean re-run. |
| `agelin init` | Scaffold `agelin.config.json`. | First-time project setup. |
| `agelin init --template=<name>` | Drop a starter subagent into `.claude/agents/`. | See [Starter templates](#starter-templates) below. |
| `agelin --rules` | List every rule with its severity and description. Grep-friendly. | Discovering rule ids for config overrides. |
| `agelin --version` / `-v` | Print version. | |

Add `--format=json` to `check` / `bench` / `baseline` / `report` for machine-parseable output (also: `markdown`, `sarif`, `github-annotations`).

### Starter templates

`agelin init --template=<name>` drops a ready-to-use subagent into `.claude/agents/`. Six templates, all scoring ≥98/100 on agelin's rubric:

| Template | What it is |
|---|---|
| `code-reviewer` | Drop-in code review agent. |
| `test-runner` | Runs tests after code edits. |
| `debug-helper` | Diagnoses errors with stack-trace + repro extraction. |
| `subagent-enhancer` | **Runs the lint+fix loop on any other subagent.** Use this after `agelin check` to apply judgment-based fixes Claude can't auto-rewrite (description triggers, inputs sections, examples, output-shape). Caps at 3 iterations targeting score ≥ 90. |
| `answer-judge` | Sonnet-4.6 grader on a 5-dim rubric (correctness / clarity / completeness / conciseness / technical-accuracy). Re-usable for benchmarking your own agents' answer quality — drives the case-study layer. |

---

## What the rules catch

**Frontmatter hygiene.** Subagents that won't load: missing `description`, name/filename mismatch, comma-separated `tools` strings instead of YAML arrays, references to retired Claude model IDs. In our scan of 97 popular public subagents, **14% failed basic frontmatter parsing** — they show up as `(unnamed)` because the parser dies before reaching `name`.

**Body structure.** Long-form prompts are where most quality is lost. We catch prompts that are too short to specify anything (under 50 tokens), too long to keep attention (over 2000), missing worked examples (64% of wild subagents), missing input preconditions (94%), missing output-shape contracts (60%), or written as tutorials that teach the user instead of instructing the agent.

**Behavior safety.** The expensive failure modes. `tool-overreach` flags read-only descriptions paired with `Write` / `Edit` / `Bash` permissions. `cost-bomb` flags recursive subagent fan-out without a budget. `unbounded-retry` flags retry loops with no numeric cap. `injection-vector` flags `$ARGUMENTS` interpolation without quoting. `no-verification-step` fires when an agent can mutate code but never tells itself to run the tests — **52% of wild subagents** edit code and then declare done.

**Contracts.** A subagent without a contract drifts. We catch tools declared in frontmatter but never used in body prose (avg **2.5x per agent** in the wild scan), description fields padded with hype clichés instead of trigger conditions ("expert in", "10x", "world-class" — 35% of agents), unresolved cross-references to other agents that the Task tool isn't authorized to invoke, and exit phrases that terminate in vague adverbs ("until satisfied", "as appropriate") with no concrete predicate.

Across the 97-agent baseline, the mean score landed at **65.9 / 100** — median 68, range 5 to 94. Plenty of room to move.

→ Full rule reference (all 34 with severities, fix-it messages, source links): [`docs/rules.md`](docs/rules.md). Or run `agelin --rules` for the inline grep-friendly listing.

---

## `bench` and golden tasks

`check` is enough for most users. Skip this section unless you actually want to run the dynamic benchmark.

### Backends

| Backend | Compatible with | Requires | Flag |
|---|---|---|---|
| `api` | Any Anthropic API account | `ANTHROPIC_API_KEY` env var | `--backend=api` |
| `claude-code` | Claude Pro **or** Claude Max subscription | `claude` CLI on PATH (authenticated) | `--backend=claude-code` |

The default `--backend=auto` prefers `claude-code` when the CLI is on PATH and `ANTHROPIC_API_KEY` is missing — anyone with a Pro / Max subscription can run the benchmarks at no per-token cost.

```bash
# Flat-rate (Pro or Max): routes through your local `claude` CLI
agelin bench ./.claude/agents/ --backend=claude-code

# Pay-per-token (API): direct Messages API
export ANTHROPIC_API_KEY=sk-ant-...
agelin bench ./.claude/agents/ --backend=api --model=claude-sonnet-4-6
```

Non-Anthropic models (OpenAI / Gemini / local Ollama) are not supported today. The `Backend` interface in [`src/eval/backends/index.ts`](src/eval/backends/index.ts) is shaped for swap-in implementations; on the roadmap, not in 0.x.

### Authoring a golden task (the bit users miss)

A "golden task" is a single JSON file under `tasks/<category>/<task-id>.json` that the bench harness loads. Each task is one prompt + a deterministic assertion that says whether the agent's reply was right. Skeleton:

```json
{
  "id": "review-finds-bug",
  "category": "code-review",
  "title": "Reviewer should spot the obvious null-deref",
  "prompt": "Review this code for bugs:\n\n```js\nfunction get(o) { return o.x.y; }\nget(undefined);\n```",
  "assertion": {
    "kind": "all-of",
    "assertions": [
      {
        "kind": "any-of",
        "assertions": [
          { "kind": "regex", "pattern": "null\\s*deref|cannot\\s+read|undefined", "flags": "i" },
          { "kind": "regex", "pattern": "check\\s+(if\\s+)?(o|input)\\s+is", "flags": "i" }
        ]
      }
    ]
  },
  "budget": { "maxDurationSec": 30, "maxToolCalls": 2 }
}
```

**The shape, in plain English:**
- `prompt` — what the bench harness sends to the agent.
- `assertion` — a tree of regex checks. The top level is usually `all-of` (every clause must match). Each clause is `any-of` of `regex` leaves (any one phrasing of the right answer matches). Anchor the regexes to the *concept* being tested, not stylistic phrasing — agents don't always use the canonical wording. Use `flags: "i"` for case-insensitive.
- `budget` — fail the task if the agent runs longer than `maxDurationSec` seconds or makes more than `maxToolCalls` tool calls.

**Tell the bench which categories to load** in `agelin.config.json`:

```json
{
  "benchCategories": ["code-review", "research"],
  "benchRepeats": 3
}
```

`benchRepeats: 3` smooths LLM nondeterminism. The harness runs each (agent × task) tuple that many times and reports pass-rate + variance.

The case-study repo at [agelin-case-study](https://github.com/AKazaconoks/agelin-case-study) has 100 real-world tasks you can copy as a starting template — each one cites a verbatim StackOverflow URL and shows a fully-shaped assertion tree.

---

## Sample output

Multi-agent scan, compact summary:

```
$ agelin check ./.claude/agents/
⚠ build-validator           Score: 90  (undefined-output-shape, missing-input-preconditions)
⚠ code-fixer                Score: 86  (no-negative-constraints, tool-body-mismatch, +3 more)
✗ legacy-reviewer           Score: 23  (no-exit-criteria, no-negative-constraints, +4 more)
✗ security-auditor          Score: 29  (tool-overreach, vague-pronouns, +2 more)

4 agents checked, 18 issues across 4 agents (2 critical)

  Some issues are auto-fixable. Run `agelin fix <path>` to apply, or `agelin fix <path> --dry-run` to preview.
  Run with --verbose to see the message and fix for each issue.
```

Single-agent scan, auto-verbose layout (also via `--verbose`):

```
$ agelin check ./.claude/agents/security-auditor.md
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

---

## Auto-fix

Four rules have safe auto-fixes today. For everything else (description rewrites, missing examples, etc.), use the [`subagent-enhancer`](#starter-templates) template.

```bash
agelin fix ./.claude/agents/            # writes in place
agelin fix ./.claude/agents/ --dry-run  # preview without writing
```

| Rule | Auto-fix |
|---|---|
| `tools-as-string-not-array` | Rewrite comma-string → YAML array |
| `code-block-no-language` | Insert `text` lang tag on bare ``` fences |
| `malformed-list` | Renumber 1..N preserving indent + marker |
| `hardcoded-paths` | Replace `/home/<user>/`, `/Users/<user>/`, `C:\Users\<user>\` with `~/` (placeholder names and code blocks left alone) |

A fix lands here only when there's exactly one reasonable answer. Rules that need a judgment call (e.g. `stale-model-versions` — `claude-3-opus` could map to either Sonnet 4.6 or Opus 4.7) print the suggestion in the message but don't auto-apply.

---

## Try it without installing

The browser playground runs the full 34-rule analyzer client-side: paste an agent, see its score and per-issue fix-its, no install required.

→ **[https://akazaconoks.github.io/agelin/playground.html](https://akazaconoks.github.io/agelin/playground.html)**

Nothing leaves your browser; the rules are bundled into a static page.

---

## Configuration

Drop an `agelin.config.json` in your repo root. Three composable layers:

```json
{
  "extends": "agelin:strict",
  "plugins": ["./internal-rules.js", "@my-org/agelin-rules"],
  "rules": {
    "no-examples": "off",
    "my-org/no-internal-jargon": "error"
  },
  "benchCategories": ["code-review"],
  "benchRepeats": 3
}
```

**Presets (`extends`).** `agelin:recommended` is the implicit default — every rule at its `defaultSeverity`. `agelin:strict` bumps each rule up one notch (suggestion → warning, warning → error). Multiple presets compose left-to-right.

**Plugins (`plugins`).** Module specifiers — relative paths or bare-package names. Each plugin default-exports `{ name, rules }`; rule ids get auto-namespaced as `<plugin-name>/<rule-id>` so two plugins (or a plugin and a built-in) can never collide.

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

---

## Programmatic API

```ts
import { lint, ALL_RULES, getRule } from "agelin";

const report = await lint("./.claude/agents/");
for (const agent of report.results) {
  console.log(agent.agentName, agent.score, agent.staticIssues.length);
}
```

Stable exports follow semver: `lint`, `parseSubagent`, `parseSubagentDir`, `ALL_RULES`, `getRule`, `computeAgentScore`, `getReporter`, plus all types from [`src/types.ts`](src/types.ts) and the markdown AST from [`src/parser/markdown.ts`](src/parser/markdown.ts). Subpath imports are also supported: `agelin/rules`, `agelin/parser`, `agelin/scoring`, `agelin/reporters`.

---

## Documentation

- [`CHANGELOG.md`](CHANGELOG.md) — release notes (0.5.x is the current track)
- [`docs/principles.md`](docs/principles.md) — five principles distilled from 97 wild agents
- [`docs/migration-guide.md`](docs/migration-guide.md) — fixing a low-scoring agent, ordered by score impact
- [`docs/rules.md`](docs/rules.md) — all 34 rules with severities, fix-it messages, and source links (auto-generated via `npm run docs:rules`)
- [`docs/ci-recipes.md`](docs/ci-recipes.md) — copy-paste GitHub Actions / GitLab / pre-commit / CircleCI integrations
- [`templates/`](templates/) — six drop-in subagents that score ≥98/100 (scaffold via `agelin init --template=<name>`)

## How it differs from `cclint`

[`cclint`](https://github.com/carlrannaberg/cclint) validates that your subagent file is *valid* (frontmatter parses, naming conventions match). `agelin` checks if the subagent is *good* (catches failure patterns, runs it against benchmarks, produces a comparable score).

The two are complementary — run cclint to make sure it's well-formed, run agelin to make sure it works.

## Status

**0.5.x.** 34 static rules calibrated against a 97-agent corpus + 20-agent phase-2 case study. Four rules have safe auto-fixes. The benchmark harness is functional with two backends. Public API (the named exports above) follows semver; the `bench` programmatic surface is not yet exported and may change.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the rule-authoring contract, calibration loop, and how to add a new rule. The agent-team workflow (orchestrator + workers) is documented in [`AGENTS_CONTRACT.md`](AGENTS_CONTRACT.md).

## License

MIT
