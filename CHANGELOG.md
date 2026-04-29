# Changelog

All notable changes to `agelin`.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.0] — 2026-04-29

Rule-design refinement driven by the **phase-2 case study**
([`agelin-case-study` repo](https://github.com/AKazaconoks/agelin-case-study)
— 20 wild Claude Code subagents × 5 domain-matched StackOverflow questions
each, before/after agelin's lint+fix). Phase-2 produced a **+14.92%
combined lift** (judge total +4.14%, mean wall time -10.78%, gate was
+7%) but surfaced four agent regressions, one of which (`node-specialist`,
combined -16.1%) traced to agelin itself: the lint+fix loop *inflated*
the agent's body from 4.3 KB → 7.4 KB by mandating sections the agent
didn't need.

### Changed — token-aware skip on three structure-adding rules

Three rules were tightened to **skip on already-concise agents**
(body ≤ 1200 tokens). The mandates make sense for bloated agents but
can over-add structure to focused, terse specialists — exactly what
`node-specialist` got hit with in phase-2.

- **`no-examples`** — minimum-tokens floor raised from **300 → 1200**.
  Below 1200 tokens, the agent is concise; an example would only
  inflate body length without improving consistency. The rule still
  fires on bloated agents (>1200 tokens of prose with no example)
  where a worked example genuinely helps.
- **`undefined-output-shape`** — added a **1200-token floor**
  (previously fired regardless of body size). Below the floor, the
  agent's brevity itself signals shape; mandating an `## Output Format`
  section adds overhead.
- **`missing-input-preconditions`** — added a **1200-token floor**
  (previously fired regardless of body size). Below the floor, the
  description field already adequately states inputs.

The 1200-token threshold is an empirically-tuned middle ground:
phase-2's `node-specialist` was 1100 tokens before lint+fix and
inflated to ~1900 after. The new threshold preserves the rules' value
on bloated agents while letting concise specialists keep their tightness.

### Added
- Per-rule unit-test coverage for the new threshold behavior:
  `tests/rule-no-examples.test.ts` (new), and updated cases in
  `tests/rule-undefined-output-shape.test.ts` and
  `tests/rule-missing-input-preconditions.test.ts`. 305 total tests
  pass on the full suite (was 298).

### Migration

For most users, this is silent — short agents that no longer fire
these three rules were probably already at score 100 because they had
the explicit-trigger description and other structure. If a tight
agent's score went *up* in 0.5.0, that's the new threshold removing
spurious firings. If you want the prior behavior, set the floor back
in your `agelin.config.json`:

```json
{ "ruleOptions": { "no-examples": { "minTokens": 300 } } }
```

(Note: ruleOptions is a forward-compat hook; current 0.5.0 uses the
hardcoded 1200 threshold. Custom thresholds will land in 0.5.x.)

## [0.4.1] — 2026-04-29

Public case study + automation template + LLM-as-judge layer. The big
change is shipped data under `case-study/`, not new agelin features.

### Added
- **`case-study/`** — full reproducible benchmark of agelin's effect on
  3 popular community subagents (`bash-expert` from 0xfurai,
  `full-stack-developer` and `electron-pro` from lst97) against 20
  high-vote StackOverflow questions, verbatim. 360 total bench calls
  (180 before + 180 after, 3 repeats each), claude-code backend.
  Headline numbers: static score mean 67.3 → 100, bench timeouts
  −37%, strict pass rate +5%, loose-semantic pass rate ~tied,
  LLM-judge total ~tied (96.06 → 95.97), mean wall time per cell
  −7.84% (51.7 s → 47.6 s). Full per-agent and per-task breakdown in
  `case-study/README.md`. Every raw bench result is checked in
  (`case-study/results/before.json`, `case-study/results/after.json`).
- **`tasks/case-study/*.json`** — the 20 task fixtures, each citing
  its source SO URL and anchoring its assertion to the accepted
  answer's central concept(s). Pass/fail is deterministic regex; the
  LLM-judge layer (below) is a separate axis.
- **`templates/subagent-enhancer.md`** — a Claude Code subagent that
  automates the case-study workflow on any subagent file. Lints with
  `agelin check`, applies `agelin fix`, applies the judgment-based
  fixes per each rule's `fix:` advice, re-lints, reports before/after.
  Stops at 3 attempts if it can't reach a static score of 90.
- **`templates/answer-judge.md`** — a Sonnet-4.6 grader subagent that
  scores answers on 5 dimensions (correctness 25 / clarity 20 /
  completeness 20 / conciseness 15 / technical-accuracy 20 = 100)
  with calibration anchors and JSON-only output discipline. Drives
  the LLM-as-judge layer of the case study; re-usable for anyone
  benchmarking subagent answer quality.
- **`case-study/judge.ts`** — driver that stages `answer-judge.md`,
  fans out judge calls (configurable parallelism + repeats via env
  vars, RESUME mode for quota-recovery), parses the JSON grade out
  of the CLI reply, and aggregates to `case-study/results/judge.json`
  with median across repeats.
- **`case-study/rescore-loose.py`** — post-hoc semantic re-score of
  the bench JSONs. Surfaces honestly that the strict regex
  assertions miss valid answers when the agent uses different
  markdown formatting, and that the case study's real signal is
  *speed* (mean wall time, timeouts) rather than *correctness*
  (the wild agents already understand these concepts at ~96/100).

### Changed
- Main README now headlines the case-study numbers + links to the
  full data.

### Added — VS Code extension (separate marketplace publish, 0.1.x)
- New sub-project under `editor/vscode/`: a Visual Studio Code
  extension (`agelin-vscode`) that lints subagent markdown files on
  open / edit / save and surfaces every issue as an inline diagnostic
  with severity, line, message, and fix-it on hover.
- Bundled with `bun build` into a single 108 KB CommonJS file —
  marketplace `.vsix` weighs **43 KB**. No install-time deps once
  published; agelin is inlined.
- Honors `agelin.config.json` from the workspace root (presets,
  per-rule severity overrides, plugins).
- Two settings: `agelin.enable` (default `true`) and `agelin.glob`
  (defaults to `**/.claude/agents/**/*.md` + `**/*.agent.md`,
  accepts an array of patterns or a single string).
- CI now typechecks + bundles the extension on every push so a
  breaking agelin API change can't slip past pre-marketplace.
- Marketplace publish is a one-time manual step by the maintainer
  (`vsce login akazaconoks` + `npm run package` + `vsce publish`).

#### 0.1.1 (post-real-world testing)
- **Wider default glob.** 0.1.0's strict `**/.claude/agents/**/*.md`
  meant users opening an `.agent.md` from Downloads or a folder
  outside the standard Claude Code layout saw nothing. 0.1.1 lints
  any of: `**/.claude/agents/**/*.md` OR `**/*.agent.md`.
- **`agelin.glob` accepts string OR array of strings.** Legacy
  string form still normalises at runtime; array form is preferred
  for multi-pattern configs.

## [0.4.0] — 2026-04-28

Adoption surface: an in-browser playground anyone can try without
installing.

### Added
- **Browser playground** at
  https://akazaconoks.github.io/agelin/playground.html . Paste a
  subagent, get a 0–100 score and a per-issue list with severity tags,
  line numbers, and fix-it advice — all running client-side. Same 34
  rules, same scoring, same parser as the CLI. Zero data leaves the
  browser.
- **`parseSubagentFromString(raw, displayPath?)`** — new public API
  entry point that parses a subagent from an in-memory string. The
  playground uses it; editor extensions and other library consumers
  that already have the markdown loaded can use it too. The existing
  `parseSubagent(filePath)` now delegates to this function after
  reading the file.
- **`npm run playground:build`** — bundles
  `src/playground/entry.ts` + transitively-imported parser/rules/scoring
  via `bun build` to a single ~100 KB ESM module at
  `site/playground.bundle.js`. Re-run before each release if rules
  changed; commit the bundle (the GitHub Pages deploy is a static-files
  copy with no Node runtime).
- **`.github/workflows/pages.yml`** — auto-deploys `site/` to GitHub
  Pages on every push to `main`. One-time setup the repo owner does
  once: Settings → Pages → Source: GitHub Actions.
- **`site/index.html` link to the playground** + the hero stat for
  static rules updated to 34 (was a stale 15).

### Changed
- README links to the playground from the Quickstart section.

## [0.3.0] — 2026-04-28

CI integration depth + editor integration. The four 0.x.x releases up
to here covered authoring + reading agents; this one covers the rest of
where agelin needs to live: native GitHub PR annotations, GitHub Code
Scanning, and editor autocomplete on `agelin.config.json`.

### Added
- **`--format=github` reporter.** Emits GitHub Actions workflow
  commands (`::warning file=…,line=…::`) so each issue renders as a
  native PR-review annotation — the inline red/yellow/blue squigglies
  on the diff. Severity maps as `error → ::error::`,
  `warning → ::warning::`, `suggestion → ::notice::`. Paths are
  repo-relative with forward slashes regardless of platform; messages
  and properties URL-encode `%`/`\r`/`\n`/`,`/`:` per GitHub's spec.
- **`--format=sarif` reporter.** Emits a SARIF v2.1.0 document for
  upload to **GitHub Code Scanning** (Security → Code scanning alerts)
  or any other SARIF consumer (Sonar, GitLab SAST, etc.). The output
  declares all 34 rules in `tool.driver.rules[]` so consumers know
  about rules even before any of them fires; results carry stable
  `partialFingerprints` so GitHub dedupes alerts across re-runs.
- **JSON Schema for `agelin.config.json`.** Generated from the live
  rule registry by `npm run schema:gen` and shipped as
  `schema/agelin.config.json`. Stable URL via JSDelivr's npm proxy:
  https://cdn.jsdelivr.net/npm/agelin@latest/schema/agelin.config.json .
  `agelin init` now scaffolds a config file with the `$schema`
  reference at the top — VS Code / Cursor / IntelliJ get autocomplete
  + inline validation for free.
- **Updated `.github/workflows/agelin.yml`** — drops in a workflow
  that gives users three layers of visibility on every PR:
  1. PR annotations (per-issue squigglies on the diff)
  2. Sticky comment with the leaderboard + score deltas
  3. Optional SARIF upload to Code Scanning (commented out by default)

### Changed
- **README rewrite of the bench-backend section.** Pre-0.3.0 the
  framing was Max-plan-centric and read as if Pro users were excluded
  and other LLMs were possible. Both wrong: the `claude-code` backend
  works on Claude **Pro or Max** (anyone whose `claude` CLI
  authenticates), the `api` backend works on **any** Anthropic API
  account, and **non-Anthropic models are not supported today**
  (~3-5 days of integration work per family; on the roadmap).
- **README "Sample output" section** shows both the multi-agent
  summary and the single-agent verbose layout.
- Workflow file renamed `subagent-lint.yml` → `agelin.yml` to match
  the package name. Anyone using the old reusable-workflow URL needs
  to update their `uses:` reference.

### Tests
- 17 new tests across `reporter-github.test.ts` (9) and
  `reporter-sarif.test.ts` (8). Total now 295+ passing across 41 files.

### Deferred to 0.3.1
- **gray-matter → `yaml` migration** — fixes the parser-state bug we
  found in 0.2.2 (after one YAML failure, subsequent malformed
  inputs silently return empty data within the same process). Doesn't
  affect production behaviour (each `agelin check` is one process)
  and migrating risks cosmetic diff churn on `agelin fix` outputs, so
  we deferred. Not visible to users; cleaner internals when it lands.
- **VS Code extension** — biggest remaining adoption lever. Separate
  repo, marketplace publish, and shape of LSP integration. Sprint 4.
- **Multi-LLM bench backend** (OpenAI / Gemini / local) — real
  product feature, ~3-5 days per family. Roadmap, not urgent.

## [0.2.2] — 2026-04-28

Two rule-audit passes folded into one release: a user-feedback pass on
three high-noise rules (raised by a real `npx agelin check` run on a
ported VS Code agent), and a wider audit run against the full
97-agent calibration corpus (4 popular community repos: VoltAgent,
0xfurai, lst97, iannuttall) to surface false positives at scale.

### Fixed — user-feedback rule rework
- **`unknown-tool`** — pre-0.2.2 emitted one issue per unknown tool with
  the full 17-name canonical list pasted into every message. An agent
  imported from another ecosystem (Cline, Cursor, Copilot Workspace)
  could fire 20+ near-identical issues, filling the screen with
  duplicate text. The rule now emits a single coalesced issue per
  agent: a count, up to 8 names, an overflow indicator, and a `docUrl`
  pointing at Anthropic's [sub-agents docs][subagents-docs] instead of
  pasting the canonical list. Same detection, dramatically less noise.
- **`frontmatter-name-mismatch`** — pre-0.2.2 was an `error`-severity
  exact-string match. It rejected slug-equivalent shapes
  (`Expert React Engineer` vs `expert-react-engineer.md`) and choked on
  multi-extension filenames (`foo.agent.md`). Three changes:
  - Comparison is now slug-based (lowercase + non-alphanumeric → `-`),
    so capitalisation and word-separator differences no longer fire.
  - Multi-extension suffixes like `.agent.md` are stripped before
    comparison.
  - Severity downgraded to `suggestion`. Claude Code dispatches by the
    frontmatter `name` field, not the filename — a mismatch is a
    consistency smell, not a runtime bug. The pre-0.2.2 framing
    overstated the constraint.
- **`role-play-bloat`** — dropped the dated 2023 arxiv `docUrl`. The
  underlying observation (persona prefixes don't reliably help and
  always cost attention) is now broad enough not to need a single
  citation, and quoting an MMLU paper as the authority on agentic
  workflows was overstating the empirical case. Message softened from
  "wastes tokens / does not improve task accuracy" to "do not reliably
  benefit from persona prefixes". Detection unchanged.

### Improved — wild-corpus audit
- **`tool-body-mismatch` for Read** — fired 27 times across the corpus
  (28% of agents). The audit traced this to `Read`'s `IMPLICIT_USAGE`
  table missing common synonyms — wild agents say "analyze the source
  files" / "review the code" / "check the file" for what is clearly
  reading work. Added `analyze`, `review`, `parse`, `study`, `scan`,
  `check`, and `source files`/`source code` to Read's table.
  Wild-corpus fires for Read dropped to **2** (-25). Glob / LS / Task
  were checked in the same audit and left alone — those wild fires are
  genuinely over-declaration ("declared Glob, never described scanning
  files"), which is what the rule should catch.
- **Friendlier YAML parse-error message.** 14 of 97 wild agents fail
  YAML parsing, ~all because of unquoted `<example>` tags inside an
  unquoted `description:` field (the angle bracket is interpreted as a
  YAML flow indicator). The parser previously surfaced the raw library
  error ("incomplete explicit mapping pair; a key node is missed; or
  followed by a non-tabulated empty line at line 3, column 320: ...")
  which is technically accurate and totally opaque. The parser now
  detects the pattern and emits an actionable message naming the
  cause and offering two concrete fixes: quote the description, or
  use a YAML block scalar (`description: >-`).
- **Cascading "missing name" error suppressed when YAML fails.** Pre-0.2.2
  a YAML parse failure produced TWO issues per agent: the primary YAML
  error + "frontmatter: missing or non-string `name`" because no `data`
  was extracted. The author can't fix the missing name without first
  fixing the YAML — the cascade was redundant. Across the wild corpus,
  parse-error issues went 14 → 7 with no loss of signal.

### Added
- New per-rule unit tests for `unknown-tool` (7), `frontmatter-name-mismatch`
  (8), `role-play-bloat` (8), expanded `tool-body-mismatch` coverage (5
  new cases for the Read synonyms), `parse-error-explainer.test.ts`, and
  `parse-error-cascade.test.ts`. These rules previously had no dedicated
  tests; behaviour was only covered indirectly via fixtures.

### Corpus-wide impact (97 agents, 0.2.1 → 0.2.2)
- Total issues: **811 → 779** (-32)
- Mean score: **62.6 → 64.9** (+2.3, false-positive removal)
- Median score: 66 → 66 (unchanged — the typical agent didn't have
  these specific bugs)

### Known issue (not blocking)
gray-matter's underlying YAML parser carries state across failed parses
within a single process — after one unclosed flow mapping throws,
subsequent malformed inputs silently return empty data instead of
re-throwing. Doesn't affect production behaviour (each `agelin check`
invocation is one process), but means the cascade-suppression test
lives in its own file (`tests/parse-error-cascade.test.ts`) so it gets
a fresh state. Worth migrating off gray-matter to a stricter YAML
library in a future release.

[subagents-docs]: https://docs.claude.com/en/docs/claude-code/sub-agents

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
