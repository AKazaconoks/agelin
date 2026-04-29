<!-- before / bash-expert / so-52499617-npm-install-vs-ci / run 3 -->

**Duration**: 47.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a complete breakdown of `npm ci` vs `npm install`:

---

## Core Difference: Where Versions Come From

| | `npm install` | `npm ci` |
|---|---|---|
| Resolves versions from | `package.json` semver ranges | `package-lock.json` exact pins |
| Modifies lock file? | Yes, if newer versions resolve | Never |
| Removes `node_modules` first? | No (incremental) | Always |

---

## Is `npm ci` Faster?

**Yes, significantly** — typically 2–10x faster in CI. The reasons:

1. **No semver resolution** — exact versions are already in the lock file, so npm skips the resolution step entirely
2. **No incremental checks** — it nukes `node_modules` and reinstalls fresh, avoiding file-by-file comparison
3. **No lock file writes** — skips serializing the resolved tree back to disk

---

## Is It "Stricter"? Yes — and That's the Point

`npm ci` will **fail fast** if:
- `package-lock.json` doesn't exist
- The lock file is out of sync with `package.json`

This strictness catches configuration drift early. It doesn't make your *tests* harder — it just ensures tests run against a **known, identical dependency tree** every time, eliminating "works on my machine" issues.

---

## When to Use Each

**Use `npm ci`:**
- CI/CD pipelines
- Production builds / Docker images
- Any automated/reproducible environment

**Use `npm install`:**
- Local development
- Adding or upgrading packages
- Regenerating the lock file

---

## One Critical Prerequisite

`npm ci` requires `package-lock.json` to be **committed to version control**. If your `.gitignore` excludes it, `npm ci` will fail. Make sure `package-lock.json` is tracked by git.

---

**Bottom line:** In your CI pipeline, replace `npm install` with `npm ci`. You get faster, reproducible, and more reliable builds with zero downside.