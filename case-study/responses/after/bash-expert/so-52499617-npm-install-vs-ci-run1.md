<!-- after / bash-expert / so-52499617-npm-install-vs-ci / run 1 -->

**Duration**: 16.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /npm\s+ci\s+(is\s+)?strict/i | output did not match /(strict|exact)\s+(install|version|match)/i | output did not match /(does\s+not\s+(modify|update|change)\s+(the\s+)?(lock|package-lock))/i | output did not match /(deletes|removes|wipes|clean)\s+node_modules/i | output did not match /(throws?\s+(an?\s+)?error|fails?)\s+(if|when)\s+(the\s+)?(lock|package[- ]?lock)/i

---
## `npm install` vs `npm ci`

These two commands serve different purposes and are optimized for different contexts.

---

### `npm install`

- Resolves and installs dependencies based on `package.json`
- **Updates `package-lock.json`** if it's out of sync with `package.json`
- Installs packages into `node_modules`, adding what's missing
- Can add new packages or bump versions within semver ranges
- Intended for **development workflows**

### `npm ci` ("clean install")

- Reads **only** from `package-lock.json` — `package.json` is used just for validation
- **Deletes `node_modules`** entirely before installing (always a clean slate)
- **Fails** if `package-lock.json` is missing or out of sync with `package.json`
- Never modifies `package-lock.json`
- Intended for **CI/automated environments**

---

### Is `npm ci` faster?

**Yes, generally** — for a few reasons:

- It skips the dependency resolution step (lock file is authoritative)
- It skips writing back to `package-lock.json`
- The tradeoff: the full `node_modules` deletion means it can be *slower* than `npm install` if `node_modules` is already populated — but most CI runners start from a clean state or restore a cache keyed on the lock file

---

### Does it make tests "harder"? (More reliable)

**Yes, in a good way.** `npm ci` ensures:

- Every CI run uses the **exact same dependency tree** as every other run
- No accidental version drift from resolved semver ranges
- Reproducible builds — what worked locally is what runs in CI
- Catches cases where someone forgot to commit an updated `package-lock.json`

---

### When to use which

| Situation | Command |
|-----------|---------|
| Adding/updating a package locally | `npm install <pkg>` |
| Syncing `node_modules` during development | `npm install` |
| CI/CD pipelines | `npm ci` |
| Docker image builds | `npm ci` |
| Reproducible builds | `npm ci` |
| Lock file is missing (first-time setup) | `npm install` |

---

### Quick rule of thumb

> **If you're a human developing locally, use `npm install`. If you're a machine running automation, use `npm ci`.**

The fail-fast behavior of `npm ci` (crashing when the lock file is stale) is a feature, not a bug — it catches consistency problems early rather than letting a silently different dependency version cause a confusing test failure.