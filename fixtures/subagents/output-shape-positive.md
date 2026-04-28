---
name: output-shape-positive
description: An agent body that never specifies the shape of its deliverable; should fire `undefined-output-shape`. Use when a target lacks any output contract.
tools:
  - Read
  - Grep
---

You will be given a repository path. Investigate the codebase and determine
whether it follows the team's logging conventions.

## Workflow

1. Walk the repo looking for log statements.
2. Compare each call site against the team conventions.
3. When you have inspected the call sites, stop.

## Constraints

- Do not edit source files.
- Do not invent conventions that are not documented.

Stop when you have inspected every log statement.
