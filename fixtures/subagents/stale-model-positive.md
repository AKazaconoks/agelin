---
name: stale-model-positive
description: Use when the user wants a quick prose summary of a research paper using a Claude model.
model: claude-3-sonnet
tools:
  - Read
---

When invoked, summarise the supplied paper in three paragraphs.

Use claude-3-opus if the document is longer than 50 pages, otherwise the
default model is fine. The original 2023 baseline used claude-2, which
should no longer be referenced in new prompts.

## Output

Return a markdown summary with three paragraphs.

## Exit criteria

Stop once the summary is written.
