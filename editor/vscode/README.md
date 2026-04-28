# agelin — VS Code extension

Inline quality diagnostics for **Claude Code subagents** (`.claude/agents/*.md`).
The same 34 rules the [`agelin` CLI](https://www.npmjs.com/package/agelin)
ships, running in your editor as you type.

## What it catches

- Tools declared but never used in the body
- Read-only descriptions paired with write tools
- `$ARGUMENTS` injection vectors
- Recursive subagent fan-out without a budget
- Hardcoded user paths, malformed lists, broken code-block fences
- Hype-cliché descriptions, missing exit criteria, missing input
  preconditions, and 25+ more — see the
  [full rule reference](https://github.com/AKazaconoks/agelin/blob/main/docs/rules.md).

Each issue surfaces with severity (error / warning / suggestion), the rule
id, the line, the message, and a fix-it hint.

## How it activates

The extension lints any markdown file whose path matches **any** of the
patterns in the `agelin.glob` setting. The defaults cover two
conventions:

- `**/.claude/agents/**/*.md` — the standard Claude Code subagent
  layout (project `.claude/agents/` and user `~/.claude/agents/`).
- `**/*.agent.md` — the cross-ecosystem `.agent.md` suffix used by
  Cline, Cursor, and VS Code's agent-mode files.

Add patterns for custom layouts:

```jsonc
// .vscode/settings.json
{
  "agelin.glob": [
    "**/.claude/agents/**/*.md",
    "**/*.agent.md",
    "**/subagents/**/*.md"
  ]
}
```

Backward-compat note: a single-string value (`"agelin.glob": "**/foo.md"`)
is still accepted; the extension normalises both shapes at runtime.

To turn the extension off without uninstalling:

```jsonc
{ "agelin.enable": false }
```

## Configuration that lives elsewhere

Severity overrides, plugins, the `agelin:strict` preset — those all
come from `agelin.config.json` at your repo root, the same as the CLI
uses. The extension picks it up automatically. See the
[main agelin docs](https://github.com/AKazaconoks/agelin#configuration)
for the full schema (the JSON Schema gives autocomplete in
`agelin.config.json` for free).

## Try without installing

[https://akazaconoks.github.io/agelin/playground.html](https://akazaconoks.github.io/agelin/playground.html)
runs the same lint engine in your browser. Paste an agent, get a score.

## Issues

Filed against the parent repo:
[github.com/AKazaconoks/agelin/issues](https://github.com/AKazaconoks/agelin/issues).
