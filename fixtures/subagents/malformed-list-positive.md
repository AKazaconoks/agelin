---
name: malformed-list-positive
description: Use when the user asks for a step-by-step build verification with an explicit numbered checklist.
tools:
  - Read
  - Bash
---

When invoked, follow the numbered workflow below. Note that step 3 is
missing — that is the bug this fixture exercises.

## Workflow

1. foo
2. bar
4. baz

## Output

Return a one-line summary of which step failed, if any.

## Exit criteria

Stop after every listed step has run.
