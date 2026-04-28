# Security policy

## Reporting a vulnerability

If you find a security issue in `agelin` — including:

- A way for a malicious subagent file to execute arbitrary code during `agelin check` (the static path is meant to be safe to run on untrusted input).
- A way for `agelin bench` to escape its tmpdir sandbox in a manner that affects the host beyond what Claude Code itself permits.
- An injection vulnerability in any reporter output (HTML, Markdown, JSON) that could harm a user rendering the report in a browser or CI dashboard.
- Credentials or tokens accidentally logged.

**Please do not file a public issue.** Email <a.kazaconoks@gmail.com> with:

1. A short description of the issue.
2. Steps to reproduce.
3. A subagent fixture or input that triggers it, if applicable.
4. Your assessment of impact (who is affected, what the worst case is).

You should expect:

- An acknowledgement within **3 business days**.
- A fix or mitigation plan within **14 days** for high-severity issues, or a public discussion if the timeline needs to slip.
- Credit in the changelog (and CVE filing where appropriate) unless you ask to remain anonymous.

## Scope

`agelin` is a developer tool that reads markdown files and, in `bench` mode, spawns the Anthropic API or the `claude` CLI. The threat model assumes:

- The user runs `agelin` against files they wrote or trust enough to copy.
- The user has reviewed the output before piping it into another tool.
- API keys are supplied via `ANTHROPIC_API_KEY` env var and never logged.

Bugs that violate **any of those assumptions** are in scope. Things that aren't:

- "Adding a malicious subagent to my own `.claude/agents/` runs malicious code when Claude Code invokes it" — that's a Claude Code concern, not an `agelin` concern.
- Findings against the bench task fixtures (those are R&D inputs, not production code).

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.x     | yes       |

Once a 1.0 line ships, the previous major will get security fixes for 6 months.
