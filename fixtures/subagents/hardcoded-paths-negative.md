---
name: hardcoded-paths-negative
description: Use when the user wants to dump pipeline output and config notes using portable paths.
tools:
  - Read
  - Write
---

When invoked, save the rendered report to `./output/` and append a
one-line summary to the daily log under `~/.config/myapp/log.txt`.

If the cache directory under `$HOME/.cache/myapp/` is missing, create it
first.

For documentation purposes, `/home/user/` and `/Users/yourname/` are
acceptable placeholders to mention — they aren't real users.

```bash
# Code-block paths are example output, not portability bugs.
cp report.txt /home/alice/output.txt
ls C:\Users\bob\config.yaml
```

## Output

Return a JSON object with `path`, `bytes`, and `summary`.

## Exit criteria

Stop once the file is written and the summary is logged.
