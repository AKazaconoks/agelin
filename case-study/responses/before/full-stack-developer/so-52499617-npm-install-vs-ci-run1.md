<!-- before / full-stack-developer / so-52499617-npm-install-vs-ci / run 1 -->

**Duration**: 42.7s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /npm\s+ci\s+(is\s+)?strict/i | output did not match /(strict|exact)\s+(install|version|match)/i | output did not match /(does\s+not\s+(modify|update|change)\s+(the\s+)?(lock|package-lock))/i | output did not match /(deletes|removes|wipes|clean)\s+node_modules/i | output did not match /(throws?\s+(an?\s+)?error|fails?)\s+(if|when)\s+(the\s+)?(lock|package[- ]?lock)/i

---
Here is a complete breakdown of `npm ci` vs `npm install`:

---

## `npm ci` vs `npm install`

### Core Difference: Source of Truth

| | `npm install` | `npm ci` |
|---|---|---|
| Source of truth | `package.json` | `package-lock.json` |
| Updates lock file | Yes, if needed | **Never** |
| Cleans `node_modules` first | No | **Always** |
| Fails on lock file mismatch | No (silently fixes it) | **Yes, hard fail** |
| Installs individual packages | Yes | No |
| Requires lock file | No | **Yes** |

---

### Is it faster?

**Yes, significantly in CI.** Two reasons compound:

1. **No resolution step** — `npm ci` skips dependency graph resolution entirely because the lock file already encodes the resolved tree. `npm install` must re-resolve semver ranges on every run.
2. **Cleaner extraction** — With a fully known install manifest, npm can parallelise download/extraction more aggressively.

In practice: **2-3x faster** on medium-to-large trees on cold CI runners.

*Exception:* On a local machine with a warm `node_modules`, `npm install` doing an incremental update is faster — the clean-slate approach is a feature in CI, a cost locally.

---

### Does it make tests harder to pass?

**No — the opposite.** `npm ci` gives you **reproducible installs**. `npm install` can silently drift: if a transitive dep releases a patch satisfying your range, two different CI runs can get different versions, causing "works on my machine" failures.

The hard fail on mismatch is a *signal*, not a problem — it tells you the lock file is out of sync before tests run.

---

### When to use each

**Use `npm ci`:**
- Any CI/CD pipeline (GitHub Actions, CircleCI, Jenkins, etc.)
- Docker image builds
- Anywhere you need guaranteed reproducibility

**Use `npm install`:**
- Locally when adding or upgrading dependencies
- When you want npm to update `package-lock.json`

---

### Recommended CI pattern

```yaml
- name: Install dependencies
  run: npm ci

- name: Run tests
  run: npm test
```

Make sure both `package.json` **and** `package-lock.json` are committed to version control — `npm ci` exits with an error if the lock file is missing.