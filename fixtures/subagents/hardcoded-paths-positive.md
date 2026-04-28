---
name: hardcoded-paths-positive
description: Use when the user wants to dump pipeline output and config notes from a known location.
tools:
  - Read
  - Write
---

When invoked, save the rendered report to `/home/alice/output.txt` and
append a one-line summary to the daily log.

Your config lives at `C:\Users\bob\config.yaml`; load it before generating
anything else.

If the cache directory under `/Users/Carol/projects/cache/` is missing,
create it first.

The deployment scripts under `/root/deploy/` should be invoked once the
report has been written.

## Output

Return a JSON object with `path`, `bytes`, and `summary`.

## Exit criteria

Stop once the file is written and the summary is logged.
