<!-- after / full-stack-developer / so-52499617-npm-install-vs-ci / run 1 -->

**Duration**: 38.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /npm\s+ci\s+(is\s+)?strict/i | output did not match /(strict|exact)\s+(install|version|match)/i | output did not match /(does\s+not\s+(modify|update|change)\s+(the\s+)?(lock|package-lock))/i | output did not match /(deletes|removes|wipes|clean)\s+node_modules/i | output did not match /(throws?\s+(an?\s+)?error|fails?)\s+(if|when)\s+(the\s+)?(lock|package[- ]?lock)/i

---
Here's the full breakdown:

---

## `npm install` vs `npm ci`

### Core Difference

| | `npm install` | `npm ci` |
|---|---|---|
| Source of truth | `package.json` | `package-lock.json` |
| Updates lockfile | Yes, if needed | **Never** — errors if out of sync |
| Wipes `node_modules` first | No | **Always** |
| Lockfile missing | Creates one | **Throws an error** |
| Lockfile out of sync | Silently reconciles | **Throws an error** |

---

### Is `npm ci` Faster?

**Yes, in CI environments.** Two reasons:
1. **No version resolution** — every version is already pinned in the lockfile, so it skips the resolution algorithm entirely.
2. **No incremental diffing** — since it always wipes `node_modules`, it never spends time comparing what's already there.

On a local machine where `node_modules` persists, `npm install` can be faster (only installs the delta). On a CI runner starting fresh every run, `npm ci` wins.

---

### Does `npm ci` Make Tests Stricter?

Not directly — it doesn't touch your test suite. But it makes the **environment stricter**, which makes test results more trustworthy:
- Refuses to run if lockfile is missing or out of sync with `package.json`
- Guarantees every CI run installs the **exact same dependency tree**
- A test failure is a real failure in your code, not a transitive dependency version mismatch

---

### Key Benefits of `npm ci` in CI

1. **Reproducibility** — eliminates "works on my machine" dependency drift
2. **Security** — verifies installed packages against lockfile integrity hashes
3. **Catches forgotten lockfile commits** — if someone adds a package locally and forgets to commit the updated lockfile, `npm ci` fails loudly
4. **No surprise lockfile mutations** — `npm install` can silently mutate the lockfile mid-CI run

---

### When to Use Each

- **`npm install`** — when actively developing: adding, updating, or removing packages
- **`npm ci`** — in any automated environment: CI pipelines, Docker builds, deployment scripts

**One-line rule:** `npm install` is for *changing* your dependency tree. `npm ci` is for *reproducing* it exactly. In CI, always use `npm ci`.