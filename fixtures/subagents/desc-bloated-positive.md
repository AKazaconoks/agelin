---
name: desc-bloated-positive
description: <example>User asks for a refactor of the auth module and we walk through the steps. The agent reads the file, identifies the public surface, and produces a diff with rationale.</example> <example>User asks to migrate from callbacks to promises. The agent inventories the callsites, drafts a migration plan, applies the rewrite, and runs tests.</example> <example>User asks to extract a shared util. The agent locates duplicates, designs the API, and updates each callsite with the new import.</example>
tools:
  - Read
  - Edit
  - Bash
---

When invoked, perform the requested refactor. Stop when the tests pass and the diff has been produced.

## Output

Return a diff and a one-paragraph rationale.
