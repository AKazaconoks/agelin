# site/

The static landing page and public leaderboard for `agelin`. One HTML
file, one example badge, vanilla JS, no build step.

## What's here

```
site/
├── index.html          # the page (loads ./leaderboard.json on boot)
├── leaderboard.json    # data — copied in at deploy time, not checked in
├── badges/
│   ├── example.svg     # static demo badge used on the landing page
│   └── <owner>/<repo>/<agent>.svg   # generated per-agent badges (deploy-time)
└── README.md           # this file
```

`index.html` is fully self-contained. Everything (CSS, JS) is inline. The
only network fetch is `./leaderboard.json` at startup. If that file is
missing or fails to load the page renders a "no leaderboard data yet"
empty state, so it's safe to deploy on day one with nothing populated.

## Deploying

The site is plain static files. Anywhere that serves static files works.

### One-shot to GitHub Pages

```bash
# from the repo root, after a leaderboard run
cp leaderboard.json site/
# (optionally) cp -r badges/* site/badges/

# push site/ to the gh-pages branch
git subtree push --prefix site origin gh-pages
```

Then in **Settings → Pages**, point Pages at the `gh-pages` branch root.

### Cloudflare Pages / Vercel / Netlify

Set the project root to `site/` and the build command to `:` (no build).
Output directory: `site/`. The leaderboard JSON should be uploaded into
`site/` before each deploy — most CI flows do this with an artifact step
that runs `agelin` against a fixed list of target repos and writes
the resulting JSON next to `index.html`.

## How `leaderboard.json` is shaped

The page accepts two shapes; either works:

```json
[
  {
    "agent": "python-pro",
    "source": "wshobson/agents",
    "sourceUrl": "https://github.com/wshobson/agents",
    "score": 87,
    "issues": [
      { "ruleId": "tool-overreach", "severity": "warning", "message": "..." }
    ],
    "taskCategories": {
      "code-review": { "pass": 5, "total": 5 },
      "research":    { "pass": 3, "total": 4 },
      "debug":       { "pass": 4, "total": 5 }
    }
  }
]
```

…or wrapped:

```json
{ "rows": [ /* same as above */ ] }
```

Rows are auto-ranked by score on load, so you don't need to pre-sort.

## Badges

Each agent on the leaderboard gets a static SVG at:

```
/badges/<owner>/<repo>/<agent>.svg
```

Embed it in a README:

```markdown
![agelin](https://agelin.dev/badges/<owner>/<repo>/<agent>.svg)
```

The example badge at `site/badges/example.svg` is the canonical shape:
shields.io-style flat layout, label "agelin" on the left in #555,
score on the right in a band coloured by score:

| Score range | Right-side colour |
|-------------|-------------------|
| 80 – 100    | #4c1 (green)      |
| 50 – 79     | #dfb317 (yellow)  |
| 0 – 49      | #e05d44 (red)     |

Generation is the responsibility of the leaderboard pipeline (out of scope
for this directory) — drop the SVGs into `site/badges/<owner>/<repo>/` at
deploy time. Cache headers should allow a few minutes of staleness; the
page itself fetches `leaderboard.json` with `cache: 'no-store'`.

## DNS / hosting notes

- The launch domain is `agelin.dev` — primary Cloudflare account.
- A `CNAME` file in `site/` is **not** committed; configure the custom
  domain in the host's UI (GitHub Pages / Cloudflare) so that switching
  hosts doesn't require a code change.
- All assets are same-origin, so no CORS configuration is needed.
- The page weighs in well under 100 ms first paint locally because there
  is no JS framework, no fonts loaded over the network, and no images
  beyond the example badge SVG.

## Local preview

Any static server works. From the repo root:

```bash
npx serve site/
# or
python -m http.server -d site 8080
```

Open `http://localhost:8080` and you should see the empty-state leaderboard.
Drop a `leaderboard.json` next to `index.html` to populate it.
