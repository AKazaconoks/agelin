<!-- after / full-stack-developer / so-52499617-npm-install-vs-ci / run 2 -->

**Duration**: 54.2s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /npm\s+ci\s+(is\s+)?strict/i | output did not match /(strict|exact)\s+(install|version|match)/i | output did not match /(does\s+not\s+(modify|update|change)\s+(the\s+)?(lock|package-lock))/i | output did not match /(deletes|removes|wipes|clean)\s+node_modules/i | output did not match /(throws?\s+(an?\s+)?error|fails?)\s+(if|when)\s+(the\s+)?(lock|package[- ]?lock)/i

---
Here's a complete breakdown:

---

## `npm install` vs `npm ci`

### Core difference

`npm install` resolves semver ranges from `package.json` and may update `package-lock.json`. `npm ci` treats `package-lock.json` as the absolute source of truth — it installs **exactly** those pinned versions, deletes `node_modules` first, and **never** modifies the lockfile.

---

### Is `npm ci` faster?

**Usually yes, ~20–30% faster** in CI environments. The speedup comes from:
- Skipping semver resolution (versions are already pinned in the lockfile)
- Batch installs instead of sequential ones

However, it always wipes `node_modules` first, so if you're caching `node_modules` between CI runs, `npm install` can sometimes win — but at the cost of reproducibility.

---

### Does it make tests more reliable? Yes, significantly.

With `npm install`, a new `2.0.3` published overnight can silently install different code across two CI runs. `npm ci` guarantees byte-for-byte identical packages every run. It also **fails loudly** if `package.json` and `package-lock.json` are out of sync, which catches the common mistake of adding a dep without committing the updated lockfile.

---

### When to use which

| Command | Use when |
|---|---|
| `npm install` | Local development, adding/upgrading deps |
| `npm ci` | CI pipelines, Docker builds, deployments, any automated context |

---

### Key gotchas

- `package-lock.json` **must exist** — `npm ci` fails without it
- Lockfile and `package.json` must agree — mismatch is a hard error (intentionally)
- It **always deletes `node_modules`** — unconditionally
- Requires lockfile version 2+ (npm 7+)

**One-line mental model:** `npm install` *changes* your dependency tree; `npm ci` *reproduces* it exactly.