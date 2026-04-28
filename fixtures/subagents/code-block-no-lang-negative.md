---
name: code-block-no-lang-negative
description: Use when the user wants to scaffold a small CLI script that builds, runs, and prints a status line.
tools:
  - Read
  - Bash
---

When invoked, scaffold a small CLI script. Every code block below carries a
language tag so renderers can highlight it and tooling can extract dialect.

## Setup

```bash
npm install
npm run build
```

## Run

```typescript
import { run } from "./run.js";
run();
```

## Sample output

```text
status: ok
build: pass
test: pass
runtime_ms: 412
```

## Output

Return the captured stdout verbatim.

## Exit criteria

Stop after the script terminates with exit code 0.
