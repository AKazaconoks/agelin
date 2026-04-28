# Twitter / X launch thread

11-tweet thread. Pin tweet 1, reply with 2-11 in order.

---

**1/**

I scanned the top 97 public Claude Code subagents.

Median score: 68/100.

14% won't even load — malformed frontmatter.

I built a linter to find out why subagent quality is so wildly inconsistent.

🧵

[image: leaderboard screenshot from site/index.html]

---

**2/**

What's a Claude Code subagent?

A markdown file in `.claude/agents/` that gives Claude a specialized persona for a specific job.

There are 1000s in the wild — full directories of "python-pro", "security-auditor", "api-designer". You copy one in and Claude routes the right job to it.

Quality is invisible. Until now.

---

**3/**

I built `agelin`. 32 rules.

20 surface-level: missing description, hype clichés ("expert in", "world-class"), tools as comma-string instead of YAML array.

12 context-aware: compare description against body, check declared tools against actual usage, parse markdown structure.

---

**4/**

The most-fired rule on 97 wild agents: `tool-body-mismatch`.

Tools declared in frontmatter that the body never references. Average: 2.5 unused tools per agent.

(Most common: `Glob` and `Edit` declared, body doesn't say "find files" or "modify".)

---

**5/**

The most damning finding:

94% of popular subagents never tell you what input they expect.

60% never tell you what output to expect.

Callers guess. Models guess. Output shape varies by agent run. Welcome to "subagent debugging".

---

**6/**

52% can edit code (Write/Edit/Bash declared) but never tell themselves to run tests, lint, or build to verify changes.

They mutate code. They report done. The user discovers the breakage later.

`no-verification-step` rule catches this.

---

**7/**

The drama:

`performance-engineer` in one popular repo: 8/100. Multiple parse errors.

`(unnamed)` x 4: agents whose YAML frontmatter is so malformed Claude Code can't even read the agent name.

`cassandra-expert`, `cockroachdb-expert`, `angular-architect`: tied at 96/100.

---

**8/**

Speed matters. The static check on all 97 agents:

3 seconds. No API calls. No money.

There's also a benchmark harness — runs each agent against a golden task suite, scores actual problem-solving. Two ways to run it:

- Direct Anthropic API ($)
- Local `claude` CLI subprocess (FREE if you have Max plan)

---

**9/**

The free path was the wedge.

Anyone forking agelin and trying to charge for it has to rebuild the subprocess plumbing. Anyone with Claude Code Max can run benchmarks for $0.

Calibration alone would have cost me $30-50 against API. Saved that.

---

**10/**

Ships with:
- GitHub Action template (PR-comment your subagent score deltas)
- `agelin diff` for CI score tracking
- shields.io-compatible badge generator
- `--fail-on=error|warning|suggestion|none`
- All 32 rules documented

---

**11/**

Repo: github.com/<owner>/agelin

If you maintain a popular subagent repo and want a courtesy heads-up
before the leaderboard goes public, DM me.

Otherwise, install: `npm install -g agelin` and run `agelin
check ./.claude/agents/` on your own.
