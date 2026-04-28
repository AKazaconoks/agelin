# CI recipes

Copy-paste integration recipes for the most common CI providers.

---

## GitHub Actions: lint subagents on every PR

Drop this at `.github/workflows/agelin.yml`:

```yaml
name: agelin
on:
  pull_request:
    paths:
      - ".claude/agents/**/*.md"
  push:
    branches: [main, master]
    paths:
      - ".claude/agents/**/*.md"

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx agelin check ./.claude/agents/ --fail-on=error
```

Fails the build only on **error**-severity issues. Warnings and
suggestions show up as informational findings — they don't block.

To fail on warnings too: `--fail-on=warning`.

---

## GitHub Actions: native PR-review annotations

Render each issue as an inline annotation on the PR diff (the
red/yellow/blue squigglies you'd get from any "real" linter). Use
`--format=github` — it emits `::warning file=…,line=…::` workflow
commands that GitHub Actions parses on the fly.

```yaml
- name: Lint subagents
  run: npx agelin check ./.claude/agents/ --format=github --fail-on=none
- name: Severity gate
  run: npx agelin check ./.claude/agents/ --fail-on=error
```

The first step always succeeds (`--fail-on=none`) so all issues are
annotated regardless of severity. The second step is the actual gate.

The full drop-in workflow at `.github/workflows/agelin.yml` in this repo
combines annotations + a sticky comment with the leaderboard + an
optional SARIF upload to GitHub Code Scanning. Copy it as-is or call
it as a reusable workflow:

```yaml
jobs:
  quality:
    uses: AKazaconoks/agelin/.github/workflows/agelin.yml@main
    with:
      fail-on: warning
```

---

## GitHub Code Scanning (SARIF)

Upload findings to the **Security → Code scanning alerts** tab. Each
issue becomes a tracked alert with rule metadata, fingerprints for
deduplication, and history across runs.

```yaml
- name: Lint subagents (SARIF)
  run: npx agelin check ./.claude/agents/ --format=sarif --fail-on=none > agelin.sarif

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: agelin.sarif
    category: agelin
```

Requires `permissions: { security-events: write }` on the job. The
SARIF output also feeds into Sonar / GitLab SAST / any tool that
consumes SARIF v2.1.0.

---

## GitHub Actions: PR-comment with score deltas

Use the `diff` command to compare PR scores against `main`'s baseline.

```yaml
name: agelin diff
on:
  pull_request:
    paths:
      - ".claude/agents/**/*.md"

jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }

      # Score the PR head
      - run: npx agelin check ./.claude/agents/ --format=json > /tmp/pr.json

      # Score main
      - run: git fetch origin main:refs/remotes/origin/main
      - run: git checkout origin/main -- .claude/agents/
      - run: npx agelin check ./.claude/agents/ --format=json > /tmp/main.json
      - run: git checkout HEAD -- .claude/agents/

      # Diff
      - run: npx agelin diff /tmp/main.json /tmp/pr.json --format=markdown > /tmp/diff.md

      # Comment on the PR (sticky, edits previous comment if any)
      - uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: /tmp/diff.md
          header: agelin
```

The PR comment shows mean-score delta, regressed agents (with new
issues), and improved agents.

---

## GitLab CI

```yaml
agelin:
  image: node:22
  script:
    - npx agelin check ./.claude/agents/ --fail-on=error
  rules:
    - changes:
        - ".claude/agents/**/*.md"
```

---

## Pre-commit hook (local)

`.git/hooks/pre-commit`:

```bash
#!/usr/bin/env bash
set -e
changed_agents=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '^\.claude/agents/.*\.md$' || true)
if [ -z "$changed_agents" ]; then
  exit 0
fi
echo "Running agelin on changed agents..."
npx agelin check ./.claude/agents/ --fail-on=error --quiet
```

Don't forget `chmod +x`.

For [husky](https://typicode.github.io/husky/) users, drop the same
content in `.husky/pre-commit`.

---

## CircleCI

```yaml
version: 2.1
jobs:
  agelin:
    docker:
      - image: cimg/node:22.0.0
    steps:
      - checkout
      - run: npx agelin check ./.claude/agents/ --fail-on=error
workflows:
  lint:
    jobs:
      - agelin
```

---

## Self-hosted leaderboard (cron)

If you want a daily score-trend dashboard, set up a small repo that
runs `agelin check` on a curated agent set and stores the JSON.
The HTML site under `site/` reads `leaderboard.json` directly.

Example cron-runner script:

```bash
#!/usr/bin/env bash
# Runs daily, scores all agents, writes to git
set -e
cd /opt/agelin-runner

# Pull latest agent list
git submodule update --remote agents/

# Score
npx agelin check ./agents/ --format=json > /tmp/scan.json

# Convert to leaderboard.json (with per-agent rank etc.)
npx tsx convert-scan-to-leaderboard.ts /tmp/scan.json > leaderboard.json

# Build HTML
npx tsx build-leaderboard-html.ts

# Commit + push (the page deploys via GitHub Pages)
git add leaderboard.json leaderboard.html
git commit -m "leaderboard $(date -u +%Y-%m-%d)" || true
git push
```

`convert-scan-to-leaderboard.ts` and `build-leaderboard-html.ts` are
in this repo's `scripts/` directory.

---

## Reading the exit codes

| Code | Meaning |
|---:|---|
| 0 | no findings at or above the `--fail-on` threshold (default: `error`) |
| 1 | at least one finding meets/exceeds the threshold |
| 2 | invalid argument (e.g. `--fail-on=garbage`) |

For unrelated runtime crashes (parser blew up, file system error), the
exit is also non-zero with a `Fatal:` prefix on stderr.

---

## Disable specific rules in CI

Override severities in `agelin.config.json`:

```json
{
  "include": [".claude/agents/**/*.md"],
  "rules": {
    "verbosity-encouraged": "off",
    "no-examples": "off",
    "tools-as-string-not-array": "warning"
  },
  "benchRepeats": 3,
  "benchModel": "claude-sonnet-4-6"
}
```

`"off"` disables a rule entirely. Severity overrides (`"warning"`,
`"error"`, `"suggestion"`) re-tag firings of that rule.
