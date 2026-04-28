---
name: hidden-tutorial-negative
description: Use when the user asks how rate limiting works in the gateway service.
tools:
  - Read
  - Grep
---

When invoked, locate the rate-limiter implementation in the gateway service
and produce a one-paragraph summary of its algorithm and configuration.

## Workflow

1. Use `Grep` to find the rate-limit module.
2. Read the implementation file.
3. Summarise the algorithm in one paragraph.

## Output

Return a one-paragraph summary.

## Exit criteria

Stop when the summary is produced.
