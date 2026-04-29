<!-- after / bash-expert / so-52499617-npm-install-vs-ci / run 2 -->

**Duration**: 42.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## `npm install` vs `npm ci`

### How they work

| | `npm install` | `npm ci` |
|---|---|---|
| Reads | `package.json` + `package-lock.json` | **Only** `package-lock.json` |
| `node_modules` | Incremental updates | **Deletes entirely**, then rebuilds |
| Lockfile | May update it | **Never** modifies it |
| Installs single pkg | Yes (`npm install lodash`) | No — full tree only |
| Fails if lockfile missing | No | **Yes** |

---

### Is `npm ci` faster?

**Yes, typically 2–10x faster** in CI because:
- Skips the dependency resolution step (uses exact lockfile versions)
- No lockfile write overhead
- More cache-friendly (predictable, stable tree)

---

### Does it make tests stricter/harder?

Stricter in a *good* way:
- **Fails fast** if `package-lock.json` is out of sync with `package.json` — catching drift early
- **Clean slate** on every run — eliminates phantom/stale dependencies hiding bugs
- **Zero version drift** — same packages everywhere, always

This makes tests *more reliable*, not harder to pass.

---

### Security benefit

`npm ci` prevents supply chain drift — no unexpected version bumps can sneak in via automatic lockfile updates in automated environments.

---

### Rule of thumb

- **Local development** → `npm install` (you're actively adding/changing deps)
- **CI/CD, Docker builds, production** → `npm ci` (reproducibility and speed matter)

```bash
# Your CI pipeline should look like:
npm ci
npm run lint
npm test
npm run build
```

**Bottom line:** Commit your `package-lock.json`, always use `npm ci` in automated pipelines.