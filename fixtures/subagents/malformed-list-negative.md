---
name: malformed-list-negative
description: Use when the user asks for a step-by-step build verification with an explicit numbered checklist.
tools:
  - Read
  - Bash
---

When invoked, follow the numbered workflow below. Indices form a strictly
increasing 1..N sequence.

## Workflow

1. foo
2. bar
3. baz

## Output

Return a one-line summary of which step failed, if any.

## Exit criteria

Stop after every listed step has run.
