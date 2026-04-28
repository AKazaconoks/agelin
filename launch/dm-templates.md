# Pre-launch DM templates

Send 18-24 hours before HN/Twitter launch, NOT day-of. Goal: give top
subagent authors a courtesy heads-up so their first reaction isn't
"who's this person calling out my agent on HN?"

Adjust per relationship. Tone: respectful, brief, value-first.

---

## Template 1 — Top 5 authors (cold contact)

> Subject: heads-up: agelin launching tomorrow
>
> Hey [name],
>
> I built `agelin`, a static analyzer + benchmark harness for
> Claude Code subagents. It's launching on HN tomorrow morning ET.
>
> Your repo `[repo-name]` is in the launch dataset (top-of-pile by
> stars). You'll see a few of your agents on the leaderboard:
>
> - `[best-agent]`: 96/100 (top tier)
> - `[middle-agent]`: 78/100
> - `[worst-agent]`: 52/100 (issues: [top 3 rule ids])
>
> I'm not going to name-and-shame in the launch — every agent in your
> repo is more carefully written than 60% of what's out there. But the
> per-agent data IS public in `targets/manifest.json` so you'll see
> them.
>
> If there's anything in the leaderboard methodology you'd like to push
> back on before it goes live, reply by [time] tomorrow. Otherwise I'll
> assume we're good.
>
> Thanks for shipping the agents — they made my own work easier when I
> was figuring out subagent patterns.
>
> [your name]

---

## Template 2 — Authors with friendly relationship

> Hey [name], shipping a thing tomorrow morning that scans 97 popular
> Claude Code subagents and scores them.
>
> Yours scored well — couple of warnings, no errors. I think you'd
> enjoy the rule list. Want a sneak peek? [link to staging, or
> README copy]
>
> Going up on HN ~9am ET tomorrow. Feel free to RT or push back, both
> useful.
>
> [your name]

---

## Template 3 — Maintainers of repos with low scores

> Hey [name],
>
> Heads-up: agelin is launching on HN tomorrow. Some of the
> agents in `[repo]` ended up at the bottom of the leaderboard, mostly
> because of [specific issue: parse errors / no input contract / no
> verification].
>
> I'm NOT going to name-and-shame in the launch tweet/post. Bottom of
> a leaderboard is a known unhelpful pattern. But the data IS in the
> public JSON, so people clicking through will find them.
>
> Two options if you want:
> 1. I delay the public dataset by a week to give you time to fix the
>    issues. They're mechanical — I'd send you a PR if you want.
> 2. You're fine with the data going live; we publish on schedule.
>
> Reply with whichever, or with anything else. Worst case, ignore this
> and we publish on schedule.
>
> [your name]

---

## Send list (fill in)

VoltAgent (`@<voltagent-handle>`):
- [ ] sent draft
- [ ] response

0xfurai (`@<0xfurai-handle>`):
- [ ] sent draft
- [ ] response

lst97 (`@<lst97-handle>`):
- [ ] sent draft
- [ ] response

iannuttall (`@<iannuttall-handle>`):
- [ ] sent draft
- [ ] response

[+5 more individual authors with high-scoring or featured agents]
