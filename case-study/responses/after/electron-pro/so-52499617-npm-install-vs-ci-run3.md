<!-- after / electron-pro / so-52499617-npm-install-vs-ci / run 3 -->

**Duration**: 44.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /npm\s+ci\s+(is\s+)?strict/i | output did not match /(strict|exact)\s+(install|version|match)/i | output did not match /(does\s+not\s+(modify|update|change)\s+(the\s+)?(lock|package-lock))/i | output did not match /(deletes|removes|wipes|clean)\s+node_modules/i | output did not match /(throws?\s+(an?\s+)?error|fails?)\s+(if|when)\s+(the\s+)?(lock|package[- ]?lock)/i

---
Here's a comprehensive breakdown:

---

## `npm install` vs `npm ci`

### What `npm ci` does differently

- **Always deletes `node_modules` first** — never reconciles an existing install, always starts clean.
- **Installs exclusively from `package-lock.json`** — the lockfile is the source of truth, not `package.json`.
- **Errors if `package.json` and `package-lock.json` are out of sync** — no silent conflict resolution.
- **Never writes to `package-lock.json`** — it's treated as read-only, so your repo state can't be mutated by the install.
- **Skips dependency resolution** — since every version is already pinned in the lockfile, the SAT-solver step is skipped entirely.

---

### Is `npm ci` faster?

**Yes, typically 2–4x faster** on a cold install, because:
1. No resolution step (versions already pinned in lockfile)
2. No reconciliation step (skips inspecting existing `node_modules`)

The exception: if your CI caches `node_modules` keyed on the lockfile hash, a cache hit is even faster. But on cold or stale caches, `npm ci` wins clearly.

---

### Does it make tests more reliable?

**Yes — this is the most important reason to use it.** `npm install` can silently produce a different dependency tree across machines, npm versions, or if the lockfile is stale. `npm ci` guarantees a byte-for-byte identical install every single run, and verifies integrity hashes for every package. No more "works on my machine" failures from version drift.

---

### When to use which

| Situation | Use |
|---|---|
| CI pipeline (GitHub Actions, CircleCI, etc.) | `npm ci` |
| Dockerfile build | `npm ci` |
| Adding/upgrading a dependency | `npm install <pkg>` |
| Generating or updating `package-lock.json` | `npm install` |
| Local dev (lockfile already committed) | Either; `npm ci` is safer |

---

### Key requirements for `npm ci`

1. **`package-lock.json` must exist and be committed** — `npm ci` errors immediately without it.
2. **Lockfile must be compatible** with your npm version (npm 7+ changed to lockfile v2/v3 format — regenerate once with `npm install` if migrating).
3. **Auth must be pre-configured** — `npm ci` doesn't prompt interactively, so set `NPM_TOKEN` in your environment before running it.

---

**Bottom line:** Use `npm install` only when actively managing dependencies (adding, upgrading, regenerating the lockfile). Use `npm ci` for everything automated — CI, CD, Docker — where reproducibility matters.