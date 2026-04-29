<!-- after / electron-pro / so-52499617-npm-install-vs-ci / run 2 -->

**Duration**: 50.1s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /npm\s+ci\s+(is\s+)?strict/i | output did not match /(strict|exact)\s+(install|version|match)/i | output did not match /(does\s+not\s+(modify|update|change)\s+(the\s+)?(lock|package-lock))/i | output did not match /(deletes|removes|wipes|clean)\s+node_modules/i | output did not match /(throws?\s+(an?\s+)?error|fails?)\s+(if|when)\s+(the\s+)?(lock|package[- ]?lock)/i

---
Here's the full breakdown:

---

## `npm install` vs `npm ci`

### Core difference

`npm ci` ("clean install") is designed for automated environments. Key behavioral differences:

- **Wipes `node_modules` before installing** — every run starts from a blank slate
- **Installs from `package-lock.json` exclusively** — no semver resolution, just unpacks the exact locked tree
- **Never modifies `package.json` or `package-lock.json`** — if anything would cause drift, it fails immediately
- **Fails fast on mismatch** — missing or out-of-sync lock file = non-zero exit, not a silent fix

`npm install` is stateful and interactive: it resolves semver ranges, updates the lock file when it finds drift, and installs incrementally on top of existing `node_modules`.

---

### Performance

`npm ci` is **faster in CI**, for two reasons:
1. Skips dependency resolution (no semver negotiation)
2. Pairs well with CI caching — cache `~/.npm` keyed on the lock file hash; on a cache hit, it just unpacks tarballs

> Cache `~/.npm`, **not** `node_modules` — since `npm ci` deletes `node_modules` every time, caching it gains nothing.

---

### Lock file behavior

| Scenario | `npm install` | `npm ci` |
|---|---|---|
| Lock file in sync | Respects it | Installs exactly what's locked |
| Lock file drifted | Updates the lock file | **Fails immediately** |
| Lock file missing | Generates a new one | **Fails immediately** |
| `node_modules` present | Installs incrementally | Deletes it first |

---

### When to use which

| Command | Use when |
|---|---|
| `npm ci` | CI/CD pipelines, Docker builds, production deploys — anywhere you want reproducibility |
| `npm install` | Adding/upgrading dependencies locally, generating/updating the lock file |

The mental model: **`npm install` is for humans changing the dependency graph; `npm ci` is for machines consuming a locked dependency graph.**

---

### Key gotchas

- **`package-lock.json` must be committed** — `npm ci` is useless if your lock file is in `.gitignore`
- **`npm ci` does not accept package names** — `npm ci lodash` is an error; it's not an interactive install command
- **Pin your npm version in CI** — lock file format versions can differ between npm releases, causing unexpected failures
- **Exit codes are reliable** — `npm ci` exits non-zero on any integrity failure, safe for `set -e` scripts with no extra guards

---

### Recommended CI pattern (GitHub Actions)

```yaml
- name: Cache npm
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('package-lock.json') }}

- name: Install dependencies
  run: npm ci
```

**Short answer:** use `npm ci` in CI always — it's faster (with caching), deterministic, and will catch lock file drift that `npm install` would silently paper over.