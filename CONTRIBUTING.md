# Contributing to agelin

Thanks for considering a contribution. This guide covers the four most
common kinds of PR.

## Setup

```bash
git clone https://github.com/<owner>/agelin
cd agelin
npm install            # or `bun install`
npx tsc --noEmit       # must be clean before any PR
npx bun test           # all green before any PR
```

We use TypeScript on Node 22+ with ESM. The CLI ships compiled via
`bun build`. Day-to-day development uses `npx tsx` so you don't need bun.

## Repo layout

| Path | What lives here |
|---|---|
| `src/types.ts` | The frozen contract. Treat as immutable across PRs. |
| `src/parser/` | Markdown + YAML frontmatter parsing. |
| `src/rules/` | One file per rule. New rules go here. |
| `src/eval/` | Benchmark runner, sandbox, tools, backends, scoring. |
| `src/cli/` | Subcommands (`check`, `bench`, `baseline`, `badge`, `report`, `init`). |
| `src/reporters/` | Output formatters: console, json, markdown, html. |
| `tasks/<category>/*.json` | Golden tasks for the `bench` subcommand. |
| `fixtures/subagents/` | Deliberately broken examples used in static tests. |
| `targets/` | Scraped public subagents (gitignored). |
| `calibration/` | Calibration config + cycle artifacts. |
| `tests/` | `bun test` unit tests. |

## 1. Adding a new rule

Each rule is one file under `src/rules/`. Use `kebab-case`, problem-first
naming (`tool-overreach`, not `check-tools-match-description`).

```typescript
// src/rules/your-rule.ts
import type { Rule, Issue } from "../types.js";

const rule: Rule = {
  id: "your-rule",
  defaultSeverity: "warning",   // or "error" | "suggestion"
  description: "One-line summary shown in --list-rules.",
  check(subagent) {
    const issues: Issue[] = [];
    // ... inspect subagent.frontmatter, subagent.body, subagent.bodyTokens
    if (/* condition */) {
      issues.push({
        ruleId: rule.id,
        severity: rule.defaultSeverity,
        message: "concrete description of what was found",
        fix: "what the author should do, with an example",
      });
    }
    return issues;
  },
};

export default rule;
```

Then register it in `src/rules/index.ts`:

```typescript
import yourRule from "./your-rule.js";
export const ALL_RULES: Rule[] = [
  // ...
  yourRule,
];
```

Add at least one fixture in `fixtures/subagents/` that triggers your rule
(and at least one that does not, so you know you didn't write a tautology).

## 2. Adding a golden task

Tasks live in `tasks/<category>/<task-id>.json` and match the `GoldenTask`
shape in `src/types.ts`. See `tasks/README.md` for the spec format.

Calibration: a good task is failed by some agents and passed by others.
If every agent passes (assertion too lenient) or every agent fails
(assertion too strict or task broken), the leaderboard signal dies.

After adding a task, run the calibration loop in `calibration/README.md`
and confirm the pass/fail spread is healthy.

## 3. Adding a new model to MODEL_PRICING

Edit `src/eval/pricing.ts`. Each entry needs input/output rates per million
tokens, and optional cache read/write rates.

```typescript
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ...
  "claude-foo-1-2": { inputPerMTok: 3, outputPerMTok: 15 },
};
```

Add a regression test to `tests/pricing.test.ts`.

## 4. Adding a new backend

Backends implement the `Backend` interface in
`src/eval/backends/index.ts`:

```typescript
export interface Backend {
  id: string;
  isAvailable(): Promise<boolean>;
  runOnce(agent, task, opts): Promise<RunResult>;
}
```

Add the new backend module under `src/eval/backends/<id>.ts`. Register it
in `pickBackend()`. Document trade-offs (sandboxing, cost model, tool-call
visibility) in the file header — see `claude-code.ts` for the template.

## PR conventions

- Branches: `feat/short-description`, `fix/short-description`,
  `docs/short-description`.
- Commit message: imperative mood, summary line under 72 chars, body
  explains why (not what — the diff shows what).
- Run `npx tsc --noEmit` and `npx bun test` before pushing.
- Open a draft PR if you want early feedback.

## Code style

- TypeScript strict mode, no `any` without a comment.
- ESM imports use the `.js` extension (TS quirk).
- Errors are values, not exceptions, in pipeline code (parser, rules).
  Throw at boundaries (CLI entry).
- No emojis in code or output strings. Box-drawing chars in console
  reporters are fine.
- Keep dependencies minimal. Stdlib first.

## Reporting bugs / proposing changes

Open an issue with:
- What you ran (full command + relevant config)
- What you expected
- What happened
- Your `agelin --version` and Node version

For rule false-positives: include the offending agent's frontmatter +
relevant body excerpt so we can repro.
