# Launch checklist

Step-by-step for the public launch. Tick boxes as you go.

## 1. Final tech polish (1-2 hours)

- [ ] `npx tsc --noEmit` — clean
- [ ] `npx bun test` — 169+ pass, 0 fail
- [ ] `npx tsx src/cli.ts check ./targets/` — finishes in under 5 seconds
- [ ] `npx tsx src/cli.ts check ./templates/` — 100/100, 100/100, 98/100
- [ ] Re-read `README.md` once with fresh eyes
- [ ] Re-read `docs/rules.md` once — no broken references
- [ ] Verify `templates/` files round-trip cleanly through `agelin init --template=...`
- [ ] `npm run build` produces `dist/cli.js` cleanly
- [ ] Sample install: `cd /tmp/test && npm install <local-tarball>` works

## 2. Repository setup (30 min)

- [ ] Decide repo name + owner (see Q1 in `QUESTIONS-FOR-USER.md`)
- [ ] `gh repo create <owner>/agelin --public`
- [ ] `git push -u origin master`
- [ ] Add `topics`: `claude-code`, `linter`, `ai-agents`, `subagent`,
       `static-analysis`, `eslint`
- [ ] Set repo description: "Static analyzer + benchmark harness for
       Claude Code subagents. Like ESLint, but for `.claude/agents/*.md`."
- [ ] Upload social-preview image (1280x640, the leaderboard screenshot)
- [ ] Enable GitHub Pages from `/site` directory for the leaderboard
- [ ] Enable Discussions
- [ ] Set up GitHub Action self-CI from `.github/workflows/ci.yml`
- [ ] Create `v0.1.0` tag, draft a release with `CHANGELOG.md` content
- [ ] Publish to npm: `npm publish` (after `npm login`)

## 3. Launch artifacts (1 hour)

- [ ] Substitute `<owner>` placeholders in:
  - [ ] `README.md`
  - [ ] `launch/hn-post-drafts.md` (3 versions)
  - [ ] `launch/twitter-thread.md`
  - [ ] `launch/dm-templates.md`
  - [ ] `launch/blog-post.md`
- [ ] Pick ONE HN draft (recommend: A — Numbers headline)
- [ ] Record demo asciicast per `launch/demo-gif-script.md`
  - [ ] Convert GIF to MP4 for Twitter
  - [ ] Save as `assets/demo.gif` in repo
- [ ] Generate the leaderboard screenshot from `launch/leaderboard.html`
       at 1280x800

## 4. Pre-launch contact (T-24 hours)

- [ ] Identify top 10 subagent-repo maintainers (top of static scan)
- [ ] DM each one per `launch/dm-templates.md`
  - [ ] VoltAgent
  - [ ] 0xfurai
  - [ ] lst97
  - [ ] iannuttall
  - [ ] [+5 more individual repos]
- [ ] Wait 18-24 hours before launch
- [ ] Address any pushback or factual corrections in launch artifacts

## 5. Launch day (Tue or Wed, 9-10 AM ET)

- [ ] Submit to HN with chosen title (no images in body)
- [ ] Within 30 seconds, post first-comment self-reply with
       methodology link + per-agent JSON
- [ ] Post Twitter thread (pin tweet 1, reply with 2-11)
- [ ] Post blog post on personal site / dev.to
- [ ] Send the launch DM to anyone who asked for it
- [ ] DO NOT cross-post to r/programming yet (kills HN ranking)

## 6. Day-of triage (next 6-8 hours)

- [ ] Reply to top 5 HN comments within an hour
- [ ] Track issues filed; queue real bugs, ignore "why no X" feature
       requests for 24h
- [ ] If a finding is challenged with evidence, update the data
       artifacts and acknowledge in-thread (transparency wins)
- [ ] Watch the `agelin` star count; thank early contributors

## 7. Day-2 follow-up

- [ ] Reddit r/programming + r/MachineLearning posts (HN-formatted)
- [ ] LinkedIn post (use blog-post.md as the long-form version)
- [ ] Email 3-5 newsletter authors who cover Claude Code (Latent Space,
       Ben's Bites, Simon Willison)

## 8. Week-2 — turn the launch into momentum

- [ ] Triage issue backlog, ship 2-3 quick wins
- [ ] Publish v0.1.1 with launch-week feedback fixes
- [ ] Start drafting a "month one" post: how the rule set evolved based
       on real-world feedback
- [ ] If GitHub Action template gets adopted by 5+ repos, start a
       hosted leaderboard at `agelin.dev`

---

## Hard "do not"s

- Do not ship `--write` mode of `agelin fix` if you haven't
  manually reviewed the patches it generates on 5+ real wild agents.
  Auto-rewriting subagents is a trust-burning move if it goes wrong.
- Do not name-and-shame specific authors in the HN post or tweet
  thread. The data is in the JSON; let curious readers click through.
  "Bottom 5 agents in this dataset" is fine; "The X repo is awful" is
  not.
- Do not engage with bait — there will be one or two HN comments
  arguing that "static analysis can't possibly capture quality" or
  "this is just regex matching". Reply once with the data, then move
  on.
- Do not promise features in HN comments. "Good idea, will consider
  for v0.2" is the correct response to every feature request on
  launch day.
