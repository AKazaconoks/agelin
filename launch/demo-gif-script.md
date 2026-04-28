# Demo GIF/asciicast script

Goal: 30-45 second loop showing the end-to-end value prop. README hero, HN
post inline image, Twitter card image.

Tools (pick one): `vhs` (charm.sh), `asciinema` + `asciinema-agg`, OBS +
`gifski`.

## Recording: terminal aspect ratio 800×600, font ~16-18px monospace

```
# Frame 1 (0-3s): clean terminal, single command
$ agelin check ./targets/

# Frame 2 (3-5s): the streaming output flying by — shows the breadth of
# the scan. Don't pause — let it scroll.

# Frame 3 (5-12s): final summary appears with sorted leaderboard
[97 agents checked, mean 65.9, top 5: cassandra-expert ...]

# Frame 4 (12-15s): clear screen, type next command
$ agelin --rules

# Frame 5 (15-20s): rule list scrolls (don't pause; the volume itself
# is the message — 32 rules)
[scrolling list of 32 rules with severities]

# Frame 6 (20-22s): clear, type
$ agelin bench ./.claude/agents/ --backend=claude-code

# Frame 7 (22-30s): live progress bar updates with cycle 4-style output
# (you can pre-record a partial-progress segment and loop it)
[Benchmarking 24 runs, ok: ..., FAIL: ...]

# Frame 8 (30-35s): summary appears
[mean 92.4, top 3: ...]

# Frame 9 (35-40s): badge generation
$ agelin badge --score=87 --agent=python-pro > badge.svg
$ open badge.svg

# Frame 10 (40-45s): the SVG appears — shields.io-styled green badge
# saying "agelin | 87/100"
```

## VHS tape (preferred — reproducible, clean output)

```vhs
# agelin-demo.tape
Output demo.gif

Set FontSize 18
Set Width 1200
Set Height 800
Set TypingSpeed 50ms
Set Theme "TokyoNight"

Type "agelin check ./targets/"
Sleep 500ms
Enter
Sleep 8s

Type "agelin --rules | head -20"
Sleep 500ms
Enter
Sleep 4s

Type "agelin badge --score=87 --agent=python-pro"
Sleep 500ms
Enter
Sleep 2s
```

Run: `vhs < agelin-demo.tape`

## What the GIF should show

The single value prop: **fast, free, real signal**.

Don't try to demonstrate the bench command in the GIF — it's too slow
to fit. Mention it in the README adjacent to the GIF: *"Static check is
3 seconds. Benchmark adds another 3-5 minutes per 100 agents — see
docs/bench.md."*

## Hosting

- Repo root: `assets/demo.gif` (under 5MB ideally)
- README hero: link with `<img src="assets/demo.gif" />`
- Twitter card: convert GIF -> MP4 (Twitter prefers video), keep
  aspect ratio 16:9 or 4:3
- HN: GIF embedded in the first comment, NOT the post itself (HN
  strips images from posts)

## Backup plan (if GIF too large or unclear)

3 static screenshots in a row:
1. `agelin check` output with 5-line top/bottom
2. `agelin --rules` truncated to top 10
3. The SVG badge

Use `carbon.now.sh` for screenshots if real terminal output looks
ragged.
