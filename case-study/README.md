# Phase 1 case study: applying agelin's recommendations to popular Claude Code subagents

> **📊 Looking for the canonical case study?** [**`agelin-case-study`**](https://github.com/AKazaconoks/agelin-case-study) — phase 2, 20 wild subagents × 5 domain-matched questions each, **+14.92% combined lift** (judge total +4.14%, mean wall time −10.78%). The phase-2 study is what motivated the agelin 0.5.0 ruleset refinement. **Most readers should start there.**
>
> This page is the earlier **phase-1** study from agelin 0.4.1: 3 subagents × 20 generic StackOverflow questions, retained for cross-comparison and historical reference. The phase-1 finding ("agelin tightens, doesn't make smarter") was a **measurement artifact** — generic questions don't stress specialty agents. Phase-2 fixed the methodology and produced a proper quality-and-time lift.

---

> Does linting an agent actually make it answer real-world questions better? We took three popular Claude Code subagents from the wild, applied agelin's recommendations to each, and re-ran them against **20 high-vote questions pulled verbatim from StackOverflow**. The questions, the agent diffs, and every benchmark cell are in this directory.

## TL;DR

- **Static score** (agelin's lint health): mean **67.3 → 100 (+32.7)**.
- **Bench timeouts** (agent took longer than the 60–90 s budget): **43 → 27 (-37%)**. The cleanest signal — most agents got faster.
- **Mean per-cell wall time** (Sonnet-4.6 graded, all 360 cells): 51.7 s → 47.6 s (**-7.84%**).
- **LLM-judge total** (5-dim rubric, 0–100): 96.06 → 95.97 (**−0.10%**). Quality is **flat**; the judge cannot tell before from after.
- **Strict bench pass rate** (regex matches the canonical answer): 52.8% → 57.8% (+5%). Modest win.
- **Loose semantic pass rate** (agent demonstrably understood the concept, regardless of phrasing): **96.1% → 96.7%** (+0.6%). Almost a wash.

The honest framing: **agelin's fixes don't change whether an agent understands a problem — they change how fast and concisely the agent communicates the answer**. Two of three agents got materially faster (`bash-expert` 17.6% faster, `electron-pro` 13.1% faster). One agent (`full-stack-developer`) regressed on speed by 5.3%. None changed on judged quality. agelin is a tightening tool, not a quality multiplier — and the case study shows this honestly rather than overclaiming.

---

## Methodology

- **3 wild agents**, picked across three different "failure profiles" we see in the wild:

  | Role | Agent | Source repo | Static score (before) |
  |---|---|---|---|
  | Wolf — narrow domain, no routing trigger | `bash-expert` | [0xfurai/claude-code-subagents](https://github.com/0xfurai/claude-code-subagents) | **78** |
  | Generalist — bloated, hype-heavy, prompt too long | `full-stack-developer` | [lst97/claude-code-sub-agents](https://github.com/lst97/claude-code-sub-agents) | **56** |
  | Specialist — tool-overreach + hype clichés | `electron-pro` | [lst97/claude-code-sub-agents](https://github.com/lst97/claude-code-sub-agents) | **68** |

- **20 real, high-vote StackOverflow questions** verbatim (with the asker's wording and code). Every task JSON cites the SO URL it came from; you can click through and verify. Every assertion is anchored to the **accepted answer's central concept(s)** — and is deterministic (regex / contains — **no LLM-as-judge**, so results reproduce across runs). Spread:

  | # | URL | Topic |
  |---|---|---|
  | 1 | [Q11227809](https://stackoverflow.com/questions/11227809) | Why is processing a sorted array faster? (branch prediction) |
  | 2 | [Q111102](https://stackoverflow.com/questions/111102) | How do JavaScript closures work? |
  | 3 | [Q762011](https://stackoverflow.com/questions/762011) | `let` vs `var` |
  | 4 | [Q523643](https://stackoverflow.com/questions/523643) | `==` vs `===` in JavaScript |
  | 5 | [Q1335851](https://stackoverflow.com/questions/1335851) | What does `"use strict"` do? |
  | 6 | [Q1132941](https://stackoverflow.com/questions/1132941) | Mutable default argument in Python |
  | 7 | [Q132988](https://stackoverflow.com/questions/132988) | `is` vs `==` in Python |
  | 8 | [Q231767](https://stackoverflow.com/questions/231767) | What does `yield` do in Python? |
  | 9 | [Q200469](https://stackoverflow.com/questions/200469) | Process vs thread |
  | 10 | [Q487258](https://stackoverflow.com/questions/487258) | Plain-English Big O |
  | 11 | [Q927358](https://stackoverflow.com/questions/927358) | How do I undo my last commit? |
  | 12 | [Q38549](https://stackoverflow.com/questions/38549) | INNER JOIN vs OUTER JOIN |
  | 13 | [Q107390](https://stackoverflow.com/questions/107390) | POST vs PUT |
  | 14 | [Q3297048](https://stackoverflow.com/questions/3297048) | 401 vs 403 |
  | 15 | [Q52499617](https://stackoverflow.com/questions/52499617) | `npm install` vs `npm ci` |
  | 16 | [Q114543](https://stackoverflow.com/questions/114543) | How do I horizontally center an element? |
  | 17 | [Q2003505](https://stackoverflow.com/questions/2003505) | Delete a Git branch locally and remotely |
  | 18 | [Q509211](https://stackoverflow.com/questions/509211) | Python slice notation |
  | 19 | [Q1789945](https://stackoverflow.com/questions/1789945) | String contains substring in JavaScript |
  | 20 | [Q419163](https://stackoverflow.com/questions/419163) | What does `if __name__ == "__main__":` do? |

- **Backend**: `claude-code` (Pro/Max plan, flat-rate). Same backend for before and after; same model. Wall time per side: ~38 minutes.

- **Repeats**: 3 per (agent, task) for variance smoothing. **180 calls per side, 360 total**. Cost: $0 (claude-code backend). Plus 720 judge calls layered on top — see the LLM-as-judge results section.

- **Fixes**: applied per the rule's own `fix:` field. The four mechanical rules went through `agelin fix`. The judgment-based ones — wording the description, adding output-shape sections, trimming prompt length — were applied by hand following each rule's recommendation. Every diff is checked in.

## Results

### Static-score lift (before → after)

| Agent | Before | After | Δ |
|---|---|---|---|
| `bash-expert` | 78 | **100** | +22 |
| `electron-pro` | 68 | **100** | +32 |
| `full-stack-developer` | 56 | **100** | +44 |
| **Mean** | **67.3** | **100** | **+32.7** |

### Bench results (before → after)

| Agent | Strict-bench pass | Δ pass | Strict-bench score | Timeouts |
|---|---|---|---|---|
| `bash-expert` | 37/60 → 40/60 | +3 | 61.7 → 66.7 | 6 → 2 |
| `electron-pro` | 28/60 → 37/60 | **+9** | 46.7 → 61.7 | 19 → 8 |
| `full-stack-developer` | 30/60 → 27/60 | -3 | 50.0 → 45.0 | 18 → 17 |
| **Total** | **95/180 → 104/180** | **+9** | **52.8 → 57.8 (+5)** | **43 → 27 (-37%)** |

The headline numbers shift if you score for *semantic correctness* instead of canonical phrasing:

| Scoring mode | Before | After | Δ |
|---|---|---|---|
| Strict regex (canonical answer phrases) | 95/180 (52.8%) | 104/180 (57.8%) | +5.0% |
| Loose semantic (key concepts present, regardless of phrasing) | 173/180 (96.1%) | 174/180 (96.7%) | +0.6% |

The 96% loose pass rate on both sides is the truth: **frontier models running these wild agents already know the right concept ~96% of the time**. agelin's fixes don't make them smarter on these questions; they make them *output the answer in fewer tokens*, which avoids time-budget failures and hits canonical phrasing more often. That's the win the rules were designed to produce.

### LLM-as-judge multi-dimensional grades

To check whether a working developer would *prefer* the after-answers (independent of the canonical-phrasing regex), we ran a Sonnet-4.6 grader subagent ([`templates/answer-judge.md`](../templates/answer-judge.md)) over every response. Five dimensions, summed to a 0–100 total:

| Dimension | Max | Before mean | After mean | Δ | Δ% |
|---|---|---|---|---|---|
| correctness | 25 | 24.94 | 24.97 | +0.03 | +0.1% |
| clarity | 20 | 20.00 | 19.97 | −0.03 | −0.2% |
| completeness | 20 | 20.00 | 20.00 | +0.00 | 0.0% |
| conciseness | 15 | 11.38 | 11.39 | +0.01 | +0.1% |
| technical_accuracy | 20 | 19.77 | 19.64 | −0.12 | −0.6% |
| **total** | **100** | **96.06** | **95.97** | **−0.09** | **−0.1%** |

**The judge sees no quality difference.** Both before and after pin at the rubric's "textbook-correct, well-formatted answer" anchor (~96/100). agelin's fixes are not detectable as quality improvements by an experienced-developer-style grader.

The win shows up on the time axis. Per-agent breakdown (combined = score Δ% + time Δ%, threshold for "significant" was +7%):

| Agent | Score Δ% | Time Δ% | Combined |
|---|---|---|---|
| `bash-expert` | +0.43% | **+17.62%** | **+18.05%** |
| `electron-pro` | −0.23% | +13.11% | +12.89% |
| `full-stack-developer` | −0.50% | **−5.33%** | **−5.84%** |
| **Mean** | **−0.10%** | **+7.84%** | **+7.74%** |

Two agents got materially faster (`bash-expert` 17.6%, `electron-pro` 13.1%). One regressed (`full-stack-developer` 5.3% slower). None changed on quality. The aggregate just clears the +7% bar, but **the per-agent dispersion matters more than the mean** — agelin produces large wins on agents with bloat to trim and can over-trim agents whose body was already operationally tight. The lesson for users: lint and inspect the diff before applying.

Methodology details:
- **Judge model**: Sonnet 4.6 (via `claude-code` backend, flat-rate Pro/Max).
- **Repeats**: 3 per cell on the before side (median taken). 1 per cell on the after side (single grade), because a quota interruption mid-run forced a single-shot recovery pass for 167 of the 180 after-cells. The before-side median is the more reliable baseline; we report the after-side single-shots without inflating significance claims.
- **Total calls**: 720 successful judge calls (540 before-side at 3 repeats + 180 after-side averaging ~1.07 repeats).
- **Per-call cost**: ~$0.10 sonnet-equivalent on the API backend; $0 on the claude-code subscription.
- **Raw grades**: every cell's individual repeat grades + critique are in `case-study/results/judge.json`.

### Per-task strict pass rate (sorted by improvement)

| Task | Before | After | Δ | Note |
|---|---|---|---|---|
| `so-11227809-sorted-array-faster` | 3/9 | 5/9 | **+2** | 6 of 9 before-fails were timeouts; agelin's verbosity cap fixed 4 |
| `so-1335851-use-strict` | 4/9 | 6/9 | **+2** | 5 of 5 before-fails were timeouts |
| `so-231767-python-yield` | 2/9 | 4/9 | **+2** | 7 of 7 before-fails were timeouts |
| `so-3297048-401-vs-403` | 3/9 | 5/9 | **+2** | 6 of 6 before-fails were timeouts |
| `so-1132941-mutable-default-arg` | 3/9 | 4/9 | +1 | mixed |
| `so-132988-is-vs-equals-python` | 6/9 | 7/9 | +1 | |
| `so-200469-process-vs-thread` | 0/9 | 1/9 | +1 | budget too tight; agents really do take 80–90 s |
| `so-38549-inner-vs-outer-join` | 1/9 | 2/9 | +1 | |
| `so-509211-python-slice-notation` | 7/9 | 8/9 | +1 | |
| `so-52499617-npm-install-vs-ci` | 3/9 | 4/9 | +1 | |
| `so-111102-javascript-closures` | 4/9 | 4/9 | 0 | |
| `so-114543-center-element` | 9/9 | 9/9 | 0 | already saturated |
| `so-1789945-string-contains-substring` | 9/9 | 9/9 | 0 | already saturated |
| `so-2003505-delete-git-branch` | 9/9 | 9/9 | 0 | already saturated |
| `so-419163-name-equals-main` | 9/9 | 9/9 | 0 | already saturated |
| `so-487258-big-o` | 0/9 | 0/9 | 0 | strict regex too literal — under loose, both pass 6/9 |
| `so-523643-equality-operators` | 0/9 | 0/9 | 0 | both pass loose 9/9 |
| `so-762011-let-vs-var` | 9/9 | 9/9 | 0 | already saturated |
| `so-927358-undo-git-commit` | 8/9 | 8/9 | 0 | |
| `so-107390-post-vs-put` | 6/9 | 1/9 | **−5** | agent uses `**Idempotent:**` markdown bold that breaks proximity-regex; under loose, both pass 9/9 |

**Observation:** the gains cluster on tasks where the before-agents were timing out, not where they were giving wrong answers. The few regressions are all assertion-strictness false negatives (the after-agent's output is correct but uses different markdown formatting from the before-agent). Under semantic scoring, no real regressions.

## What changed in each agent

For full diffs see `case-study/agents/before/<name>.md` vs `case-study/agents/after/<name>.md`. Summary of the rule-driven edits below.

### `bash-expert` (78 → 100 static, 37/60 → 40/60 bench)

5 rules fired. Edits:

- **`description-no-routing-trigger`** + **`description-uses-cliche`** — rewrote the description from `"Master of defensive Bash scripting … Expert in safe, portable, and testable shell scripts"` to a `"Use when the user asks you to write, review, or harden a Bash / POSIX shell script…"` trigger.
- **`missing-input-preconditions`** — added an `## Inputs` section listing the three input shapes the agent expects.
- **`no-examples`** — added a worked `## Example` showing a one-liner request and the expected response shape.
- **`verbosity-encouraged`** — added an `## Output discipline` section at the top with a length cap and an explicit "lead with the answer; no preamble" directive. **This single change drove the timeout drop from 6 → 2.**

### `full-stack-developer` (56 → 100 static, 30/60 → 27/60 bench)

The biggest static rewrite (13 rules), but the smallest bench gain. The original was 2093 tokens of mostly platitudes ("Practice Continuous Learning", "Champion Collaboration and Communication"). Edits:

- **`prompt-too-long`** — cut the body roughly in half. Removed the "Core Development Philosophy", "Guiding Principles", and "Constraints & Assumptions" sections (pure platitudes). Kept the workflow steps, standards, and output format.
- **`tools-as-string-not-array`** — converted comma-string `tools:` to a YAML array.
- **`tool-body-mismatch`** (×7) — trimmed the tools list from 16 entries to the 7 the body actually describes.
- **`no-verification-step`** — added an explicit "After every code change, run the project's test command and the build command" step.
- **`no-examples`** — added a worked `## Example` showing a real feature request and the expected response shape.

The bench regression (-3 passes) traces to a single task — `so-107390-post-vs-put` — where the after-agent's answer uses `**Idempotent:**` (markdown bold heading) and our regex requires `PUT\s+(is\s+)?idempotent` (literal proximity). Under loose semantic scoring this regression vanishes (9/9 both sides). It's a measurement artefact, not a real regression.

### `electron-pro` (68 → 100 static, 28/60 → 37/60 bench — biggest improver)

10 rules fired. Edits:

- **`description-uses-cliche`** + **`description-no-routing-trigger`** — rewrote description from `"An expert in building cross-platform desktop applications…"` to a `"Use when the user asks to build, refactor, or harden an Electron + TypeScript desktop app…"` trigger.
- **`tools-as-string-not-array`** — converted comma-string to YAML array.
- **`tool-body-mismatch`** (×4) — dropped Grep / Glob / WebSearch / Task from the tools list and the speculative MCP entries.
- **`undefined-output-shape`** — added an explicit `## Output format` section listing the 7 sections the agent's response should have, in order.
- **`verbosity-encouraged`** — added an `## Output discipline` section. **Drove the -11 timeout reduction (19 → 8) — by far the biggest single improvement in the case study.**
- **`missing-input-preconditions`** — added `## Inputs` listing the three input shapes.
- **`no-examples`** — added a worked `## Example` (an "Open Recent" menu item request).

## Reproduce

```bash
git clone https://github.com/AKazaconoks/agelin
cd agelin
npm install

# Run before-bench (~38 min, free on Pro/Max plan)
npx tsx src/cli.ts bench case-study/agents/before/ \
  --backend=claude-code \
  --config=case-study/agelin.config.json \
  --output=case-study/results/before.json \
  --format=json

# Run after-bench (~38 min)
npx tsx src/cli.ts bench case-study/agents/after/ \
  --backend=claude-code \
  --config=case-study/agelin.config.json \
  --output=case-study/results/after.json \
  --format=json

# Re-score under loose semantic match (the "fairer" view)
python case-study/rescore-loose.py
```

Requires the `claude` CLI on PATH and a Claude Pro or Max subscription. To use the API backend instead: `--backend=api` and set `ANTHROPIC_API_KEY`. Cost on the API backend: ~$8–15 for the full 360-call run.

## Want this automated for your own agents?

We built a Claude Code subagent — [`subagent-enhancer`](../templates/subagent-enhancer.md) — that runs this entire workflow on any subagent file:

```bash
# Copy the template into your agents directory:
cp node_modules/agelin/templates/subagent-enhancer.md .claude/agents/

# Then in Claude Code:
@subagent-enhancer .claude/agents/my-agent.md
```

It runs `agelin check`, applies `agelin fix` for the mechanical rules, applies the judgment-based fixes per each rule's `fix:` advice, re-lints, and reports before/after. Stops if it can't reach a static score of 90 in 3 iterations.

## What we did NOT do

- **Pass/fail assertions are deterministic.** Every regex/contains assertion in `tasks/case-study/*.json` is structural. Same agent + same task + same backend gives the same pass/fail across re-runs. We layered a Sonnet-4.6 LLM-as-judge ([`templates/answer-judge.md`](../templates/answer-judge.md)) on top *as a separate axis* — see the multi-dimensional grades section above. The judge is non-deterministic; we report medians (before side, 3 repeats) and single-shot grades (after side, quota-recovery pass) separately so readers can see the variance discount.
- **No cherry-picked tasks.** All 20 tasks were chosen and committed before the before-bench ran. We did not re-curate the task set after seeing results.
- **No cherry-picked repeats.** All 3 repeats per cell are in the raw `results/before.json` and `results/after.json`.
- **No edits to the agents' actual capability.** The `name` field, model, and domain expertise are preserved; the edits are entirely structural (description rewrite, tools trim, sections added, length cap, prompt-too-long trim of platitude-heavy sections).
- **No hidden assertions.** The strict regex assertions live in `tasks/case-study/*.json`; the loose-semantic re-scoring rules live in `case-study/rescore-loose.py`.

## Caveats

- **Strict regex assertions miss valid answers**, especially when the agent uses markdown formatting that breaks word proximity. We surface this honestly with the loose-semantic re-score; both numbers are reported.
- **Three repeats per cell isn't enough to prove statistical significance.** It smooths LLM nondeterminism but doesn't establish a confidence interval. The directional signals (every agent's static score went up, timeouts dropped, mean strict pass rose) are robust; per-task swings of ±1 are within noise.
- **Time budgets are tight.** Several tasks have 60 s budgets that the more verbose wild agents bust on principle. The case study's "timeout" signal is real but partly an artefact of where we set the budget.
- **The before-agents were already at 96% semantic correctness.** This case study isn't a story about agelin teaching agents new tricks — it's a story about agelin shaping how concisely they answer.

---

## Postscript — what phase 2 changed

The flat-judge result above (`96.06 → 95.97`, essentially zero) is honest *for the methodology phase 1 used*. It also turned out to be misleading: the judge couldn't see a difference because we picked **generic StackOverflow questions** (`let` vs `var`, POST vs PUT) and asked them of **specialty agents** (bash-expert, electron-pro, full-stack-developer). On generic questions, any frontier model + any subagent gives a textbook-correct answer at ~96/100. There was no quality gap to close.

Phase 2 fixed the methodology by **picking 5 domain-matched questions per agent** (only React questions for `react-pro`, only Postgres questions for `postgres-pro`, etc.) and ran the bench across **20 agents**. Result: judge total moved from 82.98 → 86.41 (+4.14%), wall time dropped 10.78%, combined lift +14.92%. All 5 judge dimensions improved.

Phase 2 also surfaced one real ruleset defect — agelin's `no-examples`, `undefined-output-shape`, and `missing-input-preconditions` rules were over-firing on already-concise agents and forcing structural inflation. **agelin 0.5.0** added a 1200-token floor to all three so they skip when the agent body is already terse. That fix is in the [v0.5.0 release notes](../CHANGELOG.md#050--2026-04-29) and the affected rules are documented in [`docs/rules.md`](../docs/rules.md).

→ Phase 2 study with full per-agent breakdown: [**github.com/AKazaconoks/agelin-case-study**](https://github.com/AKazaconoks/agelin-case-study)
