<!-- after / full-stack-developer / so-52499617-npm-install-vs-ci / run 3 -->

**Duration**: 56.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## `npm install` vs `npm ci`

### Core Difference

`npm install` is for **humans** (development). `npm ci` is for **machines** (CI/CD, Docker, deployments).

---

### Key Behavioral Differences

| Behavior | `npm install` | `npm ci` |
|---|---|---|
| Reads from | `package.json` + lockfile | `package-lock.json` **only** |
| Updates lockfile | Yes, if resolution changes | **Never** — errors instead |
| Wipes `node_modules` first | No — patches incrementally | **Always** — full fresh install |
| Lockfile missing | Creates one | **Errors out** |
| Lockfile out of sync | Reconciles and updates | **Errors out** |

---

### Is `npm ci` Faster?

**Yes, generally — in CI environments.** Reasons:

- **Skips dependency resolution** — no semver range computation, just reads the lockfile directly
- **Never writes the lockfile** — saves a disk write every run
- **More predictable cache usage** — installs exact versions without reconciliation

**Caveat:** `npm ci` always wipes `node_modules` first, so if you were caching `node_modules` between runs, `npm install` would be faster. However, caching `node_modules` is fragile and discouraged. The recommended pattern is:

```
Cache: ~/.npm  (keyed on hash of package-lock.json)
Don't cache: node_modules
```

Typical speedup: **2x–5x faster** on a clean runner with a warm npm cache.

---

### Does `npm ci` Make Tests More Reliable?

**Yes, significantly.** This is actually its primary value:

- If a developer forgets to commit an updated lockfile, `npm install` in CI silently resolves to *different* transitive dependency versions than what was tested locally
- `npm ci` **errors loudly** if `package-lock.json` is out of sync with `package.json` — making lockfile drift a visible failure, not a silent one
- Guarantees every CI run installs the **exact same tree** that was reviewed and committed

---

### When to Use Each

```
In a script, pipeline, Dockerfile, or automated context?
  YES → npm ci
  NO  → npm install
```

---

### Important Gotchas

1. **Commit your lockfile.** `npm ci` is useless if `package-lock.json` is in `.gitignore`.
2. **Pin your npm version** across the team — different npm versions generate incompatible lockfile formats.
3. **`npm ci` guarantees reproducibility, not correctness.** A committed bad lockfile installs faithfully.
4. Consider **`npm ci --ignore-scripts`** in CI for supply-chain security — prevents `postinstall` lifecycle scripts from running automatically.