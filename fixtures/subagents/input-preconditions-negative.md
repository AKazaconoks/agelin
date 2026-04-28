---
name: input-preconditions-negative
description: An agent that declares its expected inputs via both a section heading and a "you will be given" sentence; should not fire `missing-input-preconditions`.
tools:
  - Read
  - Grep
---

You will be given a repository path along with the team's logging style guide.
Investigate the codebase and produce a markdown report describing how well it
conforms.

## Inputs

- A path to the repository root.
- A short markdown style guide defining accepted log levels and prefixes.

## Workflow

1. Walk the repository.
2. Identify call sites of the standard logger.
3. Compose the report.

## Output Format

Return a markdown report with sections: Summary, Violations, Recommendations.

Stop when the report is complete.
