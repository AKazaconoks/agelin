# agelin FAQ

Pre-canned answers to questions we expect on HN, Twitter, and the
issue tracker. Reuse verbatim when the question lands.

---

### Q: This is just regex matching. How is it different from grep?

It is regex matching, plus a bit of markdown structure parsing. The
*value* isn't the matching technology — it's the **rule library**.
Each of the 32 rules came from a real failure pattern observed in the
97-agent population. You could write all of them yourself in `grep`;
nobody has, because the work of finding the patterns and turning them
into stable detection rules is what took the time.

That said: rules with cross-section reasoning (e.g.
`contradictory-role-capability`, `tool-body-mismatch`) DO need more
than regex. They use a small markdown AST to compare frontmatter
against body. See `src/parser/markdown.ts` (~150 lines, hand-rolled).

---

### Q: How is this different from `cclint`?

[`cclint`](https://github.com/carlrannaberg/cclint) is a sister
project. It validates that `.claude/agents/*.md` files conform to
Claude Code's official spec — frontmatter parses, names match,
required fields present.

`agelin` runs *quality* rules on top of well-formedness — does
the agent have an exit criteria? does it state input/output contracts?
do its declared tools match what the body actually does?

You can run both: `cclint` catches "this won't load", `agelin`
catches "this loads but is brittle".

---

### Q: Can the static rules really capture quality?

Most of them capture **brittleness**, not quality per se. An agent
without a stop condition will sometimes loop forever; an agent without
an output contract will return inconsistent shapes; an agent that
declares `Bash` but never says "run tests" will sometimes mutate code
without verifying. Static rules catch these failure modes
deterministically. They don't catch "the agent gives bad answers" —
that's what the bench harness is for.

The bench harness runs each subagent against a golden task suite (13
tasks: SQL injection, race condition, OOM, cache stampede, etc.) and
scores actual problem-solving with a regex/JSON-path assertion on the
model's output. Two separate signals, both useful.

---

### Q: How did you pick the 13 benchmark tasks?

Based on production-shaped problems I'd want a code-review agent to
catch. Each has:

- A short, Slack-shaped prompt (no homework-assignment framing)
- A realistic code or log fixture
- A two- or three-axis assertion that requires identifying both the
  root cause AND a remediation
- A budget (max tokens, cost, duration, tool-calls)

The list isn't exhaustive — it's a starting point. Adding new tasks
is encouraged. The format is documented in `tasks/README.md`. PRs
welcome.

---

### Q: Can I disable specific rules?

Yes. Drop a `agelin.config.json` in your repo root:

```json
{
  "rules": {
    "verbosity-encouraged": "off",
    "no-examples": "warning"
  }
}
```

`"off"` disables. Severity strings re-tag findings.

---

### Q: Why is mean score so low (65.9)?

The wild population has well-documented weak spots — most don't have
input contracts, half don't tell themselves to verify mutations, etc.
The score is honest; it's not tuned to look good. We're not optimizing
for an aggregate target; we're optimizing for per-rule accuracy.

If your agent scores 65/100 on first run, that's normal. Most do.
`docs/migration-guide.md` walks through the highest-leverage fixes.

---

### Q: Why don't you have a [my-favorite-rule]?

We probably do (32 rules) — check `docs/rules.md`. If we don't, two
options:

1. File an issue with: a real subagent that exhibits the pattern,
   what makes it bad, and what the rule should look for. We'll write it.
2. Write it yourself and PR — the contribution flow is in
   `CONTRIBUTING.md`. Each rule is one file, ~30 LOC, kebab-case id.

---

### Q: Does this work with TypeScript / Python / Rust subagents?

The agents are markdown files with YAML frontmatter — language doesn't
matter. The agents' instructions can reference any language. The
benchmark harness runs against Anthropic's Claude (or any model
exposed via the `claude` CLI), which handles whatever language the
task is in.

---

### Q: Why is `bench` free with Claude Code Max but paid via the API?

The Anthropic API charges per token. The Claude Code Max plan is
flat-rate. We added a backend that routes through the local `claude`
CLI subprocess, which uses your Max plan's flat-rate tokens.

Free locally, paid in CI (CI doesn't have a `claude` CLI installed).

---

### Q: Is this a shell wrapper around Claude Code?

For the bench harness's `claude-code` backend: yes, it spawns
`claude -p` with constructed prompts. For the static `check` command:
no, it's pure JavaScript.

---

### Q: Can I run agelin inside a Claude Code agent?

Yes, but currently only via the CLI. We're considering an MCP server
wrapper as a v0.2 feature so other agents can call agelin as a
tool natively. File an issue if you'd use that.

---

### Q: What's the licensing? Are you going to charge later?

MIT. No plans to charge. The static analyzer + benchmark harness will
stay open-source forever.

A hosted leaderboard (agelin.dev) might happen as a paid
service for teams that want trend tracking + private repo support —
but the CLI itself is free.

---

### Q: Why don't you just use [LLM-based] evaluation?

Three reasons:

1. **Determinism.** A regex assertion always gives the same answer.
   An LLM eval gives different answers on different runs.
2. **Cost.** A regex assertion costs $0. An LLM eval per task per
   agent costs ~$0.10. For a leaderboard scan of 100 agents × 13
   tasks, that's $130 vs $0.
3. **Trust.** Most rules detect SHAPE violations (input contract
   missing, tool list too broad). These are 100% deterministic. LLM
   eval would just be a slower, more expensive way to detect the
   same thing.

Where LLM eval shines: judging answer quality. That's what the bench
harness does (the assertion checks whether the model's output
identifies the right root cause). But the static rules don't need it.

---

### Q: How do you handle MCP tools?

`mcp__<server>__<tool>` is the canonical naming convention for Model
Context Protocol tools. We accept this pattern as valid in tool lists
without trying to validate that the MCP server is actually configured
on the user's machine — that's outside our scope.

If you have an MCP server `foo` exposing tool `bar`, declare it as
`mcp__foo__bar` in your subagent's `tools` list.

---

### Q: Will this work with Cursor / Continue / other agent runners?

The format we lint is Claude Code's `.claude/agents/*.md`. Other
runners use different formats. If you point us at another runner's
spec, we'd be willing to add a parser, but each one is a separate
project — the rules don't translate 1:1 across runners with different
tool models.

---

### Q: I have feedback on a specific rule that's firing wrongly on my agent.

File an issue with:

1. Your agent's frontmatter + the relevant body section
2. The rule that's firing
3. Why you think it's a false positive

We'll either fix the rule or document why it's behaving correctly
(some rules have legitimate edge cases). Either way, the rule's
detection logic gets clearer.
