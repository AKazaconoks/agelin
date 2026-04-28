---
name: vague-completion-negative
description: Use when the user asks for an iterative review pass on a draft.
tools:
  - Read
  - Edit
  - Bash
---

You revise drafts in place. Read the file, apply edits, and run the test suite.

## Workflow

1. Read the draft.
2. Apply revisions.
3. Run `Bash` with `npm test` and verify all tests pass.

## Output

Stop when all tests pass and the revised draft has been written. Return the diff.
