# `agelin fix --write` Stress Test Report

Date: 2026-04-27
Scope: Confidence check before collapsing `fix` to a single (always-write) mode and renaming to `agelin fix`.

## Test Sets

The user-requested target dir (`targets/0xfurai__claude-code-subagents/`, 30 agents) does not contain any agents that trigger `tools-as-string-not-array` — none of those agents declare a `tools:` frontmatter field at all. To get meaningful coverage of the rewrite path, a supplementary set of 24 agents drawn from `calibration/agents/`, `calibration/agents-extended/`, and `calibration/cycle5-agents/` (all of which use the comma-string form `tools: Read, Write, ...`) was also tested.

| Set | Source | Count | Triggers rule? |
|-----|--------|------:|----------------|
| Main | `targets/0xfurai__claude-code-subagents/*.md` | 30 | No (no `tools:` field) |
| Supp | `calibration/{agents,agents-extended,cycle5-agents}/*.md` filtered by `^tools: ` | 24 | Yes, all 24 |

Both sets were copied to working dirs (`targets-fix-test/`, `targets-fix-test-supp/`) so the in-tree files were never modified. Originals in `targets/` were not touched (and so the `git checkout targets/` restore step in the brief was a no-op — confirmed clean).

Per-agent procedure: `check --format=json > before.json` -> `fix --write` -> `check --format=json > after.json` -> compare scores, issues, file content.

Raw artifacts:
- `calibration/fix-stress/summary.tsv` (30 rows, main set)
- `calibration/fix-stress/summary-supp.tsv` (24 rows, supp set)
- `calibration/fix-stress/diffs/`, `diffs-supp/` (before/after .md pairs + fix log per agent)

## Pass Criterion Results

| Criterion | Main (30) | Supp (24) | Overall |
|-----------|----------:|----------:|---------|
| `tools-as-string-not-array` resolved post-fix | n/a (never present) | 24/24 | PASS |
| No score went DOWN | 30/30 | 24/24 | PASS |
| No file became unparseable | 30/30 | 24/24 | PASS |
| No new rule fired post-fix | 30/30 | 24/24 | PASS |

Score deltas:
- Main set: every agent delta = 0 (no-op as expected — fix detected no auto-fixable issues, file unchanged, score unchanged).
- Supp set: every agent delta = +2 (the rule going from suggestion-1 to suggestion-0, which removes one penalty bucket).

Issue-count deltas:
- Main set: 0 in every case.
- Supp set: -1 in every case (the rule itself disappears; nothing else moves).

## Spot-Check: Cosmetic Damage

Manual inspection of 5 fixed files (`agents__backend-developer`, `agents__php-pro`, `cycle5-agents__architect-review`, `cycle5-agents__performance-engineer`, `agents-extended__frontend-developer`):

- Markdown body bytes: untouched in all 5. Only the YAML frontmatter block is rewritten.
- Indentation in body: preserved (verified by line-by-line diff outside the `---...---` region — all body lines unchanged).
- Comments: none of these files contained comments inside the frontmatter, so this cannot be confirmed empirically. (See "Findings worth flagging" below.)
- The `tools:` field is rewritten as a YAML block sequence with 2-space indentation — clean, conventional output.

## Findings Worth Flagging (Not Pass-Criterion Failures)

These are observations the author should be aware of before shipping. None of them violate the stated pass criteria, and per the brief I am NOT applying any fix — just documenting.

### F1. The `description` field is also rewritten when fix runs

The fix command's stated scope is `tools-as-string-not-array`, but the YAML re-serialization side-effect is that **the entire frontmatter gets re-emitted by the YAML library**. In every supp-set file, the `description` field shifted from `description: "..."` (or unquoted single-line) into a `description: >-` folded block scalar wrapped at ~80 columns. Example (`agents__backend-developer`):

```yaml
# before
description: "Use this agent when building server-side APIs, microservices, and backend systems that require robust architecture, scalability planning, and production-ready implementation."

# after
description: >-
  Use this agent when building server-side APIs, microservices, and backend
  systems that require robust architecture, scalability planning, and
  production-ready implementation.
```

This is **semantically equivalent YAML** — every check-side parser will see the same string value, and the `after` score confirms no rule regressed. But a user opening the diff will see ~6 lines of unrelated churn per agent. If shipping a single non-interactive `fix` mode, this could surprise users who expected only the `tools:` line to change. Consider either: (a) round-tripping with a YAML library configured to preserve original style for untouched fields, or (b) calling out this behavior in the help text / changelog ("`fix` may reformat the frontmatter").

### F2. Trailing-newline normalization

For files that lacked a final `\n` (e.g. `agents__php-pro.md` originally ended mid-line), the fix added one. This is universally a positive change (POSIX-correct, git-clean) but is again outside the declared scope of the rule. Worth a one-line note in the changelog.

### F3. Duplicates in `tools:` are preserved verbatim

`cycle5-agents__performance-engineer.md` had `Bash` listed twice in its comma string. The fix preserved the duplicate as two `- Bash` array entries. This is the safe and correct behavior (don't drop user data silently), but a future enhancement could de-dupe and/or surface a separate `duplicate-tool` rule.

### F4. Comments inside frontmatter — untested

None of the 54 tested agents had YAML comments (`# ...`) inside the frontmatter, so I cannot confirm whether comments survive the round-trip. The YAML library used for fix-write should be checked: most JS YAML libraries (`yaml`, `js-yaml`) lose comments unless explicitly configured for it. **Recommend a targeted fixture test** before shipping: a synthetic agent with a frontmatter comment and `tools: A, B, C`, run fix, assert the comment survives. If it doesn't, document the loss in the help text. (I am NOT adding this fixture per the constraint.)

## Three Example Diffs

### Good (boring): `agents__backend-developer`

Standard case — `tools:` becomes an array, description re-folds, body untouched. Score 51 -> 53.

```
- tools: Read, Write, Edit, Bash, Glob, Grep
+ tools:
+   - Read
+   - Write
+   - Edit
+   - Bash
+   - Glob
+   - Grep
```

### Boring (no-op): `targets/actix-expert`

Fix correctly no-ops on agents without the issue. File unchanged byte-for-byte (`cmp -s` returns 0), check output unchanged. This is the safety case for shipping the always-write mode: running `fix` on a clean file does not corrupt it.

### Weird (preserved duplicate): `cycle5-agents__performance-engineer`

The original frontmatter had `Bash` twice in the comma string. Fix correctly preserves the duplicate as two array entries:

```yaml
# original (excerpt)
tools: Read, Write, Edit, MultiEdit, Grep, Glob, Bash, LS, WebSearch, WebFetch, Task, Bash, mcp__context7...

# after
tools:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Grep
  - Glob
  - Bash       # <-- first
  - LS
  - WebSearch
  - WebFetch
  - Task
  - Bash       # <-- duplicate preserved
  - mcp__context7__resolve-library-id
  ...
```

Conservative and correct — the rule's job is to fix the format, not to second-guess the user's tool list.

## 5-Line Summary

`agelin fix --write` is safe to ship as a single-mode command. Across 54 stress-tested agents (30 clean + 24 violators) the fix never lowered a score, never broke parsing, never introduced a new rule violation, and resolved 24/24 instances of `tools-as-string-not-array`. The only caveat: it round-trips the entire YAML frontmatter, so unrelated fields (`description`, trailing newline) will visibly reformat in the diff; this is cosmetic, not corrupting. Recommend (a) a one-line help-text note that `fix` may reformat the frontmatter and (b) a targeted fixture covering YAML comment preservation before final ship.
