# agelin launch findings

**Final results from 5 cycles of bench iteration + 24-agent leaderboard.**

This is the strongest material for the launch post. Use as source of truth.

## Headline numbers

| Source | Value |
|---|---|
| Static scan: 97 wild agents (mean / median / range) | 65.9 / 68 / 5–94 |
| Bench leaderboard: 24 agents on 12 tasks | mean 75.6 / range 57.9–86.8 |
| Bench wall time | 1h 20m for 288 runs ($0 cost via Max plan) |
| Static check wall time | ~3 seconds for 97 agents |

## The four-quadrant story (the launch hook)

We sorted 24 popular subagents by both static-rule score AND benchmark
pass rate. The cross-tabulation:

| Quadrant | Count | Mean static | Mean bench | What it means |
|---|---:|---:|---:|---|
| high static / high bench | 12 | 87.8 | 82.6 | legit good |
| **high static / low bench** | **3** | **87.3** | **69.7** | **passes the linter, fails the tests** |
| **low static / high bench** | **1** | **45.0** | **81.2** | **ugly but functional** |
| low / low | 8 | 47.8 | 66.6 | genuinely broken |

### "Wolves in sheep's clothing" — the high-low agents

These pass static checks but bomb the bench tasks. Most damning launch
finding:

| Agent | Static | Bench | Tasks failed |
|---|---:|---:|---|
| `c-expert` | 88 | 73.6 | interest-off-by-one, flaky-test, js-date-utc-roundtrip |
| `bash-expert` | 86 | 72.9 | interest-off-by-one, flaky-test, js-date-utc-roundtrip |
| `ava-expert` | 88 | 62.5 | interest-off-by-one, race-condition, flaky-test, js-date-utc, null-deref |

Common pattern: clean frontmatter, decent body structure, but the
agent is over-specialized to its named language — when handed a task
in a different domain (Python ORM N+1, Go race condition, JS Date
quirks), the agent confidently produces wrong answers.

### "Diamond in the rough" — the lone low-high agent

| Agent | Static | Bench | Why static is low |
|---|---:|---:|---|
| `architect-reviewer` | 45 | 81.2 | no-examples, frontmatter-name-mismatch, tools-as-string-not-array |

architect-reviewer's frontmatter is a mess (parse warnings, missing
fields, comma-string tools list) but the body content is rock-solid:
it diagnoses task-after-task correctly. **The linter undersold it.**

This is the strongest argument FOR running both static AND bench
analyses. Neither alone is the truth.

## Leaderboard top 10

| # | Agent | Static | Bench | Quadrant |
|--:|---|---:|---:|---|
| 1 | angular-expert | 86 | 86.8 | high-high |
| 1 | braintree-expert | 86 | 86.8 | high-high |
| 1 | cpp-expert | 86 | 86.8 | high-high |
| 1 | dart-expert | 86 | 86.8 | high-high |
| 5 | cassandra-expert | 94 | 82.5 | high-high |
| 6 | architect-reviewer | 45 | 81.2 | **low-high** |
| 7 | clojure-expert | 88 | 79.6 | high-high |
| 8 | cockroachdb-expert | 94 | 79.5 | high-high |
| 9 | django-expert | 86 | 78.5 | high-high |
| 10 | css-expert | 88 | 77.7 | high-high |

Note the 4-way tie at 86.8. This is on 1-repeat runs — granularity is
8.3 points (12 tasks). Multiple ties indicate we'd want repeats=3 for
a tighter ranking, but the 4-way tie at the top is itself a story
("most popular subagents are interchangeable on common tasks").

## Per-task pass rate (24 agents, 1 repeat)

```
n-plus-one              100% (24/24) — Python ORM, easy
oom                     100%        — diagnostic, easy
sql-injection           100%        — PHP code review, well-known pattern
accidentally-quadratic  100%        — TypeScript O(n²), after Unicode fix
cache-stampede           96% (23/24)
memory-leak              96%
timeout                  96%
flaky-test               88% (21/24) — time-of-day dependency
race-condition           75%        — Go data race, needs sync.Mutex
null-deref               71%        — Python None-handling
interest-off-by-one      63%        — daily-interest accrual, +1 trap
js-date-utc-roundtrip    25% (6/24) — hardest task, JS Date timezone
```

The bottom 4 tasks are the differentiators. They're what makes the
high-low agents stand out — they all fail interest-off-by-one
and flaky-test.

## What's NOT in the launch leaderboard but worth mentioning

- 14 of 97 wild agents have malformed frontmatter (won't load in
  Claude Code). Filtered out from cycle 5 because we couldn't bench
  what wouldn't parse.
- The 5 calibration agents (backend/django/golang/javascript/php-pro
  from VoltAgent) don't appear in the cycle-5 leaderboard because we
  ran them in cycle 4. Their bench scores there: 66.9–72.9. Same
  range as cycle 5's middle tier.
- 4 of 12 tasks scored 100% across all 24 agents. We deliberately
  kept them in the bench because they ARE the floor: an agent that
  fails sql-injection or oom is genuinely broken. Removing them
  would have hidden a useful signal.

## Reproducibility

```
git clone github.com/<owner>/agelin
cd agelin
npm install
npm run fetch-targets   # downloads the 97 public agents

# Static scan (3 seconds, no API key)
npx tsx src/cli.ts check ./targets/ --format=json --output=scan.json

# Bench leaderboard (1h 20m, $0 with Max plan)
npx tsx src/cli.ts bench ./calibration/cycle5-agents/ \
  --backend=claude-code --format=json \
  --output=leaderboard-bench.json --repeats=1
```

Both files are committed under `launch/`.
