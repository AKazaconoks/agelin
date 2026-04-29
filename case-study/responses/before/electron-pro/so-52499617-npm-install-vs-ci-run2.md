<!-- before / electron-pro / so-52499617-npm-install-vs-ci / run 2 -->

**Duration**: 47.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown from the agent:

---

## `npm install` vs `npm ci`

### The Core Distinction

- **`npm install`** — developer-facing, manages and evolves dependencies
- **`npm ci`** — machine-facing, designed for reproducible installs in automated environments

---

### How They Work Differently

**`npm install`**
- Uses `package.json` as the source of truth
- May update `package-lock.json` if it's out of sync
- Preserves existing `node_modules`, only installs/updates what changed
- Resolves version ranges via semver rules

**`npm ci`**
- Uses `package-lock.json` as the absolute source of truth
- **Always deletes `node_modules` first**, then reinstalls everything clean
- **Never modifies** `package-lock.json` or `package.json`
- Fails with an error if `package.json` and `package-lock.json` are out of sync

---

### Key Differences at a Glance

| Behavior | `npm install` | `npm ci` |
|---|---|---|
| Source of truth | `package.json` | `package-lock.json` |
| Modifies lockfile | Yes, if out of sync | Never |
| Deletes `node_modules` first | No | Always |
| Missing lockfile | Creates one | **Fails** |
| Lockfile/package.json mismatch | Resolves silently | **Fails** |
| Install individual packages | Yes | No |

---

### Is `npm ci` Faster?

**Yes, generally — in CI environments.** Two reasons:

1. **No dependency resolution** — it reads exact versions from the lockfile directly, skipping semver negotiation
2. **No incremental diffing** — always starts clean, avoiding the overhead of checking what already exists

On a local machine with existing `node_modules`, `npm install` can be faster for incremental changes. In CI where you start fresh each run, `npm ci` wins.

> To maximize `npm ci` speed in CI: cache `node_modules` or `~/.npm` keyed on the hash of `package-lock.json`.

---

### When to Use Each

**Use `npm ci` for:**
- All CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins, etc.)
- Docker builds
- Any place where reproducibility is required
- Catching lockfile drift early (fails loudly instead of silently fixing)

**Use `npm install` for:**
- Local development when adding, removing, or upgrading packages
- Intentionally updating the lockfile
- Installing a specific new package (`npm install express`)

---

### Key Gotchas

- `npm ci` **requires** `package-lock.json` to be committed to your repo — if it's missing, it fails
- `npm ci` will **fail** if `package.json` and `package-lock.json` are out of sync (someone edited `package.json` without running `npm install` after)
- Using `npm install` in CI is dangerous because it can silently update the lockfile, meaning you may ship dependency versions that were never tested locally

---

### The Short Rule

> Commit `package-lock.json`. Use **`npm install`** locally to manage dependencies. Use **`npm ci`** everywhere else.