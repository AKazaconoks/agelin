---
name: code-block-no-lang-positive
description: Use when the user wants to scaffold a small CLI script that builds, runs, and prints a status line.
tools:
  - Read
  - Bash
---

When invoked, scaffold a small CLI script. Three illustrative blocks follow:
the first two declare a language tag, the third does not and is more than
two lines long, which is the case this fixture exercises.

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

```
status: ok
build: pass
test: pass
runtime_ms: 412
```

## Output

Return the captured stdout verbatim.

## Exit criteria

Stop after the script terminates with exit code 0.
