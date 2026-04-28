# Agent Contract — for parallel build agents

This file is the source of truth for parallel work. **Read `src/types.ts` first.**

## Layout

```
src/
├── cli.ts                    # entry — DONE (wires subcommands)
├── types.ts                  # contract — DONE — DO NOT MODIFY without coordination
├── parser/
│   └── parse.ts              # AGENT A: parse .claude/agents/*.md → ParsedSubagent
├── rules/
│   ├── index.ts              # registry — DONE (skeleton, push your rules here)
│   ├── tool-overreach.ts     # AGENT A
│   ├── no-exit-criteria.ts   # AGENT A
│   ├── ... (15 rules total)  # AGENT A
├── cli/
│   ├── check.ts              # AGENT B
│   ├── bench.ts              # AGENT B (delegates to eval/)
│   ├── report.ts             # AGENT B
│   └── init.ts               # AGENT B
├── reporters/
│   ├── console.ts            # AGENT B
│   ├── json.ts               # AGENT B
│   ├── markdown.ts           # AGENT B
│   └── html.ts               # AGENT D (post-MVP polish)
├── eval/
│   ├── runner.ts             # AGENT C: spawn agent via Anthropic SDK, capture metrics
│   ├── assertions.ts         # AGENT C: evaluate TaskAssertion against RunResult
│   └── budget.ts             # AGENT C: enforce token/cost/time limits
├── scoring/
│   └── score.ts              # AGENT C: blend static + bench → AgentScore
└── tasks/
    ├── code-review/*.json    # AGENT D (golden tasks — most important polish later)
    ├── research/*.json
    └── debug/*.json
```

## Contract rules

1. **Never modify `src/types.ts`** without leaving a note in the PR description explaining
   why and what other agents need to update.
2. **Import types from `../types.js`** (note `.js` extension, ESM convention).
3. **One rule = one file.** Export a default `Rule` object. Register in `src/rules/index.ts`.
4. **No external network calls** outside `src/eval/`. Static rules must be deterministic and offline.
5. **Test fixtures** go in `fixtures/subagents/`. Use realistic examples scraped from
   public repos (e.g. wshobson/agents, VoltAgent).
6. **Errors are values, not exceptions.** Push to `parseErrors[]` or return `Issue[]`.
7. **No emojis in code.** Output formatting in reporters can use box-drawing chars.

## Build & test

```bash
bun install
bun run dev check ./fixtures/subagents/
bun test
bun run lint
```

## v0 deliverable

User can run `agelin check ./fixtures/subagents/` and see meaningful output
with at least 10 rules firing across realistic example subagents.
