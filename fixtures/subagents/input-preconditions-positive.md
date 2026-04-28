---
name: input-preconditions-positive
description: An agent body that never states what inputs it expects; should fire `missing-input-preconditions`. Use to verify the suggestion-level rule.
tools:
  - Read
  - Grep
---

Investigate the codebase and produce a markdown report describing the
project's logging conventions.

## Workflow

1. Walk the repository.
2. Identify call sites of the standard logger.
3. Compose the report.

## Output Format

Return a markdown report with sections: Summary, Violations, Recommendations.

Stop when the report is complete.
