<!-- before / bash-expert / so-52499617-npm-install-vs-ci / run 1 -->

**Duration**: 48.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /npm\s+ci\s+(is\s+)?strict/i | output did not match /(strict|exact)\s+(install|version|match)/i | output did not match /(does\s+not\s+(modify|update|change)\s+(the\s+)?(lock|package-lock))/i | output did not match /(deletes|removes|wipes|clean)\s+node_modules/i | output did not match /(throws?\s+(an?\s+)?error|fails?)\s+(if|when)\s+(the\s+)?(lock|package[- ]?lock)/i

---
Here's a comprehensive breakdown of `npm install` vs `npm ci`:

## TL;DR

- **`npm install`** — for local development and managing packages
- **`npm ci`** — for CI/CD pipelines, Docker builds, and production deployments

---

## Key Differences

| Aspect | `npm install` | `npm ci` |
|--------|---------------|----------|
| Lock file usage | Updates if needed | Must match exactly (read-only) |
| Dependency resolution | Resolves from `package.json` | Uses `package-lock.json` directly |
| `node_modules` | Incremental updates | Deletes and reinstalls from scratch |
| Modifies files? | Can update `package-lock.json` | Never modifies any files |
| Speed | Slower | Typically **2–10x faster** |
| Error behavior | Continues with warnings | **Fails fast** on any mismatch |
| Lock file required? | No | **Yes — errors if missing** |

---

## Why `npm ci` is faster in CI

`npm install` has to resolve the full dependency tree from `package.json`, check semver ranges, compare existing vs required versions, and potentially update the lock file. `npm ci` skips all of that — it reads `package-lock.json` directly and installs exactly what's there.

---

## Does it make tests "harder"?

Not harder — **stricter and more reliable**. It ensures every CI run uses identical dependency versions, which:
- Eliminates "works on my machine" problems
- Prevents flaky tests caused by surprise dependency updates
- Catches forgotten lock file commits (fails if `package.json` and `package-lock.json` are out of sync)

---

## Quick rules

**Use `npm ci` when:**
- Running in CI/CD pipelines
- Building Docker images
- Deploying to production
- You want a clean, reproducible install

**Use `npm install` when:**
- Adding or updating packages locally
- Initial dev setup after cloning
- You intentionally want to update within semver ranges

---

The most important prerequisite: **always commit your `package-lock.json`** — `npm ci` will fail without it.