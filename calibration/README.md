# Calibration

Goal: validate that our 8 golden tasks produce a meaningful signal — strong agents
should pass tasks that match their domain, weak agents should fail tasks they
shouldn't be able to handle. **If everyone passes everything (or nothing) the
leaderboard tells no story.**

## The 5 calibration agents

Picked from `targets/` to match each task's language so a "natural fit" signal
exists. Cross-language failures are part of the signal too.

| Agent | Source | Natural fit task |
|---|---|---|
| `backend-developer` | VoltAgent | generalist baseline |
| `javascript-pro` | VoltAgent | `memory-leak` (Node) |
| `django-developer` | VoltAgent | `n-plus-one` (Python ORM), `null-deref` (Python), `flaky-test` (Python) |
| `golang-pro` | VoltAgent | `race-condition` (Go) |
| `php-pro` | VoltAgent | `sql-injection` (PHP) |

Total runs: 5 agents × 8 tasks × 1 repeat = **40 calls**.
Estimated cost on Sonnet 4.6: **~$1-3** depending on tool-use depth.

## Run it

Two ways:

```bash
cd agelin

# static check first (free, validates frontmatter etc.)
npx tsx src/cli.ts check ./calibration/agents/

# Option 1: free benchmark via your local Claude Code subscription
#   - requires `claude` CLI on PATH and a Max plan; no API key needed.
npx tsx src/cli.ts bench ./calibration/agents/ \
  --backend=claude-code --format=markdown > calibration/results.md

# Option 2: paid benchmark via the Anthropic Messages API
export ANTHROPIC_API_KEY=sk-ant-...
npx tsx src/cli.ts bench ./calibration/agents/ \
  --backend=api --format=markdown > calibration/results.md

cat calibration/results.md
```

`--backend=auto` (the default) picks `claude-code` when the `claude` CLI is
on PATH and `ANTHROPIC_API_KEY` is unset; otherwise it uses `api`. You can
also set `SUBAGENT_LINT_BACKEND=claude-code` in your shell to make the choice
sticky for CI.

Caveats of the `claude-code` backend:

- Tool calls inside the spawned subagent run with Claude Code's real
  permissions, not agelin's tmpdir sandbox. The bench tasks are
  diagnostic and we set `cwd` + `--add-dir` to the per-task tmpdir, but be
  aware that an agent which deliberately mutates files outside that dir
  could in principle do so.
- `claude -p --output-format json` does not currently surface per-tool-call
  counts, so `RunResult.toolCalls` is empty under this backend. Concretely:
  `tool-called` assertions will always fail and `no-tool-called` will always
  pass. Use `--backend=api` if you need tool-call assertions.

The cache (`.agelin/cache/`) means re-runs of the exact same
(agent, task, model) triple are free. Iterating on assertion text → re-run is free.
Iterating on prompt or fixture → cache invalidates → costs again.

## What to look for

After the first run, open `calibration/results.md` and check each task column:

- **All 5 agents pass** → assertion is too lenient. Tighten it.
- **All 5 agents fail** → assertion is too strict, OR the task itself is broken.
- **Natural-fit agent passes, others variable** → signal is good. Ship it.
- **Natural-fit agent fails** → either the agent is bad (note for the launch
  narrative) or our assertion rejects valid answers (false negative — tune).

## Iteration loop

1. Run benchmark.
2. Read failures: in `results.md` look at `failureReason`. Was the answer correct
   but the regex missed it? → relax. Was the answer hallucinated/missing? →
   keep strict.
3. Edit the task JSON. Cache invalidates for that task.
4. Re-run.
5. Repeat until each task has 1-3 passes and 2-4 fails across the 5 agents.
   That's the sweet spot.
