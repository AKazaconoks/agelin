---
name: stale-model-negative
description: Use when the user wants a quick prose summary of a research paper using a current Claude model.
model: claude-sonnet-4-6
tools:
  - Read
---

When invoked, summarise the supplied paper in three paragraphs.

Use claude-opus-4-7 if the document is longer than 50 pages, otherwise
the default claude-sonnet-4-6 is fine.

## Output

Return a markdown summary with three paragraphs.

## Exit criteria

Stop once the summary is written.
