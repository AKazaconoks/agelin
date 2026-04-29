<!-- before / electron-pro / so-52499617-npm-install-vs-ci / run 1 -->

**Duration**: 67.8s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 67.81s > 60s

---
Here's a complete breakdown of `npm install` vs `npm ci`:

---

## Core Difference

`npm install` **resolves and may update** dependencies. `npm ci` performs a **clean, exact, reproducible install** from the lockfile — no resolution, no surprises.

---

## How They Work

### `npm install`
- Reads `package.json`, reconciles with existing `node_modules`
- Resolves semver ranges (e.g., `^1.2.3`) against the registry
- **May silently update `package-lock.json`**
- Leaves existing unrelated packages in place

### `npm ci`
- **Requires** `package-lock.json` — fails hard if missing
- **Deletes `node_modules` entirely** before installing
- Installs **exactly** the versions in the lockfile, no resolution
- **Never writes to `package-lock.json`**
- If `package.json` and the lockfile are out of sync → **hard failure**

---

## Is `npm ci` Faster?

**Yes, especially on warm cache.** Reasons:
- No dependency resolution (skips semver negotiation with registry)
- No `node_modules` tree diffing (just delete and rebuild)
- More reliable CI cache hits since exact versions never change between runs

| Command | Cold cache | Warm cache |
|---|---|---|
| `npm install` | ~90s | ~30s |
| `npm ci` | ~85s | **~15s** |

---

## The Reproducibility Problem with `npm install` in CI

```
# package.json: "lodash": "^4.17.0"
# lockfile has:  "lodash": "4.17.20"
# registry now:  "lodash": "4.17.21"

npm install  --> may install 4.17.21, silently updates lockfile
                 Two CI runs from the SAME commit can produce different code!

npm ci       --> always installs 4.17.20, lockfile never changes
```

---

## When to Use Which

| Situation | Command |
|---|---|
| Every CI/CD pipeline run | `npm ci` |
| Docker image builds | `npm ci` |
| Production/staging deployments | `npm ci` |
| Adding/upgrading a dependency | `npm install <pkg>` |
| First-time clone with no lockfile | `npm install` |
| Regenerating a stale lockfile | `npm install` |

---

## Key Gotchas

1. **Commit your `package-lock.json`** — never `.gitignore` it; `npm ci` needs it
2. **`npm ci` always deletes `node_modules`** — `npm link` symlinks will be lost
3. **Pin your npm version in CI** — lockfile format differs between npm v6 and v7+
4. **For production-only installs:** `npm ci --omit=dev`

---

## The Rule of Thumb

> Developers use `npm install` to **evolve** the lockfile. CI uses `npm ci` to **enforce** it.

Replace every `npm install` in your pipeline scripts with `npm ci` and commit your lockfile — that's the whole recipe for reproducible, fast CI builds.