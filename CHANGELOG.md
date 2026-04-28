# Changelog

All notable changes to `agelin`.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.1] — 2026-04-28

### Added
- **Verbose console output** for `agelin check`. Each issue now renders
  with its full message, fix-it hint, and line number — not just the
  rule id. The verbose layout auto-engages when checking a single
  agent (the natural "I'm inspecting this one" shape); pass
  `--verbose` to force it on multi-agent runs.
- **Bottom-of-summary hint** points at `agelin fix` when at least one
  auto-fixable issue was found, and at `--verbose` when issues exist
  in summary mode. Helps users discover next-step actions.
- The summary now shows a `+N more` suffix when an agent has more
  than two firing rules, instead of silently truncating.

### Fixed
- The totals row was misleading: it printed `agentsWithIssues` under
  the label "issues", so a 1-agent run with 8 issues read as
  "1 agents checked, 1 issues, 2 critical". Now reads as
  "1 agent checked, 8 issues across 1 agent (2 critical)".

## [0.2.0] — 2026-04-28

### Added
- **Auto-fix breadth.** `agelin fix` now handles four rules instead of
  one: `tools-as-string-not-array`, `code-block-no-language` (inserts
  `text` lang tag), `malformed-list` (renumbers 1..N preserving indent
  and marker), and `hardcoded-paths` (replaces user-home paths with
  `~/`, skipping placeholders and code blocks). Detection logic is
  carefully aligned with each rule's `check()` so a fix never lands
  on something the rule wouldn't flag.
- **Config presets.** `extends: "agelin:recommended"` (default) and
  `extends: "agelin:strict"` (bumps each active rule up one notch:
  suggestion → warning, warning → error). Compose multiple presets
  via an array; user `rules` always win last.
- **Plugin loader.** Custom rules via `plugins: ["./my-rules.js"]` in
  config. Plugin module default-exports `{ name, rules }`; rule ids
  are auto-namespaced as `<plugin-name>/<rule-id>`. Plugin rules
  participate in everything (presets, severity overrides, suppressions).
- **Inline disable comments.** ESLint-style suppressions in agent
  bodies:
  - `<!-- agelin-disable-next-line rule-id -->`
  - `<!-- agelin-disable rule-a, rule-b -->` … `<!-- agelin-enable -->`
  - `<!-- agelin-disable -->` (file-wide) … `<!-- agelin-enable -->`

  Whole-agent rules (those that emit issues without a line number) are
  suppressed by any block disable that names them, regardless of where
  in the file the directive lives. `disable-next-line` is single-line
  and never silences a whole-agent rule.
- **Programmatic API: rule list, suppressions.** `lint()` already
  exported; the new `runRulesOnAgent`, `collectSuppressions`,
  `isSuppressed`, `loadPlugins`, and `applyExtends` are part of the
  semver-stable surface for embedders.

### Changed
- The three CLI commands (`check`, `bench`, `baseline`) and the
  programmatic `lint()` now share a single rule-runner module
  (`src/lint-runner.ts`). Behavior is identical; the consolidation was
  a prerequisite for adding suppressions in one place.
- `agelin fix [path]` (no flag) writes in place by default — this was
  the 0.1.0 behaviour but the help text and README now reflect it
  consistently. `--dry-run` previews.

### Tests
- 246 passing (up from 207 at 0.1.0). New suites:
  `presets.test.ts` (9), `plugins.test.ts` (10),
  `suppressions.test.ts` (18), and four new fixer cases in
  `cli-fix.test.ts`.

## [0.1.0] — 2026-04-28 — initial public release

Published to npm as `agelin@0.1.0`. See README for the feature list.

## [Pre-0.1.0]

### Added
- `agelin fix [path]` — auto-correct safe rule violations.
  Default mode is dry-run; pass `--write` to apply. v1 supports
  `tools-as-string-not-array` only.
- `agelin cache stats|clear` — manage the bench result cache,
  with optional `--older-than-days=N` filter.
- `agelin diff <baseline.json> <current.json>` — compare two
  check/bench JSON outputs. Outputs colored console, markdown
  (PR-comment ready), or JSON.
- `agelin --rules` — list all 32 registered rules with their
  severities, sorted by id.
- `--fail-on=error|warning|suggestion|none` — control the exit-code
  threshold. Default behavior preserved (fail on errors).
- `--quiet` — hide clean agents from console output (machine formats
  unaffected).
- `templates/` — three drop-in agent starters that pass the linter
  (`code-reviewer.md` 100/100, `test-runner.md` 100/100,
  `debug-helper.md` 98/100).
- `docs/rules.md` — auto-generated reference for all 32 rules with
  shields.io severity badges, fix-it examples, and source links.
  Generator: `npm run docs:rules`.
- 12 context-aware rules added in the cycle-2 batch:
  - `tool-body-mismatch` — declared tools never referenced in body
    (uses an implicit-usage-verb table to dodge false positives)
  - `contradictory-role-capability` — three-signal AND-gate
    (restrictive role + write tools + body action verbs)
  - `undefined-output-shape` — body never specifies output structure
  - `missing-input-preconditions` — body never specifies expected inputs
  - `unresolved-cross-references` — references `@other-agent` without
    declaring `Task` tool (with JSDoc-tag false-positive guards)
  - `code-block-no-language` — fenced blocks without a language tag
  - `malformed-list` — ordered lists with gaps (e.g. 1, 2, 4)
  - `hardcoded-paths` — `/home/<user>/`, `C:\Users\<user>\`, etc., in
    body prose (excluded inside code blocks)
  - `stale-model-versions` — references to retired Claude model IDs
  - `description-uses-examples-instead-of-summary` — `<example>`-stuffed
    descriptions over 300 chars
  - `vague-completion-criteria` — explicit-exit phrases without concrete
    predicates
  - `hidden-tutorial` — instruction prompts that teach the user instead
    of instructing the agent
- Markdown tokenizer (`src/parser/markdown.ts`, ~150 LOC, zero deps)
  exposing `tokenizeMarkdown` and `MarkdownAST`. Powers the
  context-aware rules.
- Shared tool-list helpers (`src/parser/tools.ts`): `getToolList`,
  `isMcpTool`, `isWriteTool`, `isReadOnlyTool`, plus `CANONICAL_TOOLS`,
  `WRITE_TOOLS`, `READ_ONLY_TOOLS` sets.

### Changed
- `tool-body-mismatch` severity: warning → suggestion. Tuning was
  required after observing 449 firings/97 agents at warning severity
  collapsed wild-population mean from 77.8 to 36.4. The rule now also
  recognizes 50+ implicit-usage verbs (`read`, `edit`, `run`, `delegate`,
  etc.) so calling out a `Bash` tool the body invokes via "run npm test"
  no longer false-fires.
- `unknown-tool` rule: now accepts the MCP-tool naming convention
  (`mcp__<server>__<tool>`) and `LS` + `MultiEdit` (omitted from earlier
  CANONICAL_TOOLS list). Pre-fix, the rule misidentified 150 valid tool
  references as unknown across 97 wild agents.
- `tools-as-string-not-array` severity: error → suggestion. Anthropic's
  spec accepts the comma-string form; we now treat it as style guidance.
- `no-exit-criteria` severity: error → warning. Detection broadened to
  recognize implicit terminal-deliverable contracts (workflow markers,
  numbered steps ending in a return verb).
- `no-negative-constraints` detection broadened to accept positive-
  restriction forms ("only X", "limit to Y", "scoped to") in addition
  to the original negative phrasings ("do not X").
- Bench cycles 1→2 saw mean per-agent climb 68.9 → 92.4 after raising
  task `maxDurationSec` budgets. Cycle 1 reviewers identified that 66
  of 68 cycle-1 "failures" were duration-budget aborts on legitimately
  correct outputs.

### Fixed
- `claude-code` backend: removed `--bare` flag (it forces
  `ANTHROPIC_API_KEY`-only auth, defeating the Max-plan flow). The
  backend now correctly authenticates via OAuth/keychain.
- `claude-code` backend: spawn EINVAL on Windows (was forcing
  `claude.cmd` resolution, but the binary ships as `claude.exe`). Now
  uses bare `claude` and lets Node walk PATHEXT. Also disabled
  `shell: true` which was mangling multi-line prompts.
- `claude-code` backend: `costUsd` now hard-coded to 0. The CLI's
  `total_cost_usd` reports the API-equivalent cost, but Max-plan users
  pay $0 incrementally; the previous behavior caused
  `enforceBudget()` to fail textbook-correct runs against per-task
  ceilings.
- Cache key now includes the repeat index. With `repeats > 1`, distinct
  repeats now hash distinctly; previously they collapsed into one cache
  entry, making the cache useless for repeat studies.
- Bench progress events now fire LIVE per (agent, task, repeat) instead
  of in one batch at the end. Tracker is passed through to
  `runBenchmark` and the UI updates as each run completes.
- Bench cache writes are now incremental — `runBenchmark` accepts an
  `onResult` callback that bench.ts uses to save each result the moment
  it lands. A killed bench now retains all the work it already did.
- Score formula: when all `costUsd` are 0 (free claude-code backend),
  drop `costEfficiency` weight to 0 and renormalize the remaining
  weights (37.5 / 50 / 12.5 instead of 30 / 40 / 20 / 10). Without
  this, free benchmarks scored uniformly inflated.

### Calibration data (cumulative — all 5 cycles complete)

| Cycle | Scope | Wall | Pass rate | Mean | Notes |
|---|---|---|---:|---:|---|
| 1 | 5 × 8 × 3 = 120 | 35:39 | 43% | 68.9 | Duration-budget bottleneck identified |
| 2 | 5 × 8 × 3 = 120 | 35:41 | 94% | 92.4 | Budgets raised; assertions widened |
| 3 | 10 × 8 × 3 = 240 | 34:47 | 94% | 91.5 | Broadened agent set; same ruleset |
| 4 | 5 × 13 × 3 = 195 | 1h11m | 64% | 69.1 | 5 new harder tasks added (signal returned) |
| 5 | 24 × 12 × 1 = 288 | 1h20m | 84% | 75.6 | Launch leaderboard. Range 57.9–86.8 |

Cycle 5 four-quadrant analysis:
- 12 agents high-static / high-bench (mean 87.8 / 82.6) — legit good
- 3 agents high-static / low-bench (mean 87.3 / 69.7) — wolves in
  sheep's clothing: c-expert, bash-expert, ava-expert
- 1 agent low-static / high-bench (45 / 81.2) — diamond in the rough:
  architect-reviewer
- 8 agents low / low (mean 47.8 / 66.6) — genuinely broken

Static-scan stats on 97 wild public subagents at the post-batch ruleset:
mean 65.9, median 68, range 5–94. Top 5 (96/100): cassandra-expert,
cockroachdb-expert, angular-architect, javascript-pro, nextjs-developer.

### Launch artifacts (under `launch/`)

- `static-scan-headline.md` — five-fact narrative for HN/launch post
- `wild-population-static-scan.json` — full per-agent static data (97)
- `launch-leaderboard.json` — bench-driven leaderboard (24 agents)
- `key-findings.md` — 4-quadrant analysis source-of-truth
- `hn-post-drafts.md` — 3 HN title+body variants
- `twitter-thread.md` — 11-tweet pin+thread
- `dm-templates.md` — pre-launch contact templates
- `blog-post.md` — long-form for personal blog / dev.to / Medium
- `launch-checklist.md` — step-by-step launch day
- `faq.md` — 12 pre-canned answers for HN comments + issue tracker
- `demo-gif-script.md` — VHS tape for hero GIF
- `leaderboard.html` — 40 KB self-contained launch leaderboard

### Tests
- 181 tests / 0 fail / 466 expect() calls / 28 test files

## [0.0.1] — initial development

Initial commit. Pre-release. APIs unstable.
