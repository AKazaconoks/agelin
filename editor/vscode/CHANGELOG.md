# Changelog

## [0.1.1] — 2026-04-28

### Changed
- **Wider default glob.** Pre-0.1.1 we only linted files whose path
  matched `**/.claude/agents/**/*.md` — strictly the Claude Code
  project layout. Real users open agent files from anywhere
  (Downloads, ad-hoc folders, the cross-ecosystem `.agent.md` shape
  used by Cline / Cursor / VS Code agent mode), and saw nothing. The
  default now covers two patterns:
  - `**/.claude/agents/**/*.md` (Claude Code project + user trees)
  - `**/*.agent.md` (any file using the `.agent.md` suffix)
- **`agelin.glob` setting accepts an array of patterns**, not just a
  single string. The legacy string form still works — the extension
  normalises both at runtime — but the array form is preferred. Add
  more patterns for custom layouts:
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

## [0.1.0] — 2026-04-28

Initial public release.

- Lints `.claude/agents/*.md` files on open / edit / save.
- Surfaces all 34 agelin rules as inline diagnostics with severity,
  line, message, and fix-it advice on hover.
- Honors `agelin.config.json` from the workspace root: presets
  (`agelin:recommended` / `agelin:strict`), per-rule severity
  overrides, custom plugins, all of it.
- Configurable glob (default `**/.claude/agents/**/*.md`) and an
  on/off switch (`agelin.enable`).
- Powered by `agelin@^0.4.0` — same rule engine as the CLI, bundled
  into a single 108 KB `extension.js` so the extension has no
  install-time dependencies once it's published.
