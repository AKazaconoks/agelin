<!-- after / electron-pro / so-52499617-npm-install-vs-ci / run 1 -->

**Duration**: 16.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a clear breakdown of `npm install` vs `npm ci`:

## `npm install` vs `npm ci`

### `npm install`
- Reads `package.json` to resolve dependencies
- **Can update** `package-lock.json` if it's out of sync
- Installs packages into `node_modules`, **reusing** what's already there
- Allows minor/patch version drift (within semver ranges)
- Designed for **development** workflows

### `npm ci` ("clean install")
- Reads **only** `package-lock.json` — `package.json` is used only for validation
- **Fails** if `package-lock.json` is missing or out of sync with `package.json`
- **Deletes** the entire `node_modules` directory before installing
- Installs exact versions — zero version drift, ever
- Designed for **CI/CD and automated** workflows

---

## Is `npm ci` faster?

**Yes, typically.** Because it:
1. Skips dependency resolution (lockfile is the truth)
2. Skips writing/updating `package-lock.json`
3. Optimizes the install path for the clean-slate scenario

The delete + reinstall sounds slower, but in CI you usually start from a clean environment anyway (or cache `node_modules` between runs), so you rarely pay that cost.

---

## Key behavioral differences

| Behavior | `npm install` | `npm ci` |
|---|---|---|
| Modifies `package-lock.json` | Yes (if drift exists) | Never |
| Fails on lockfile mismatch | No — silently fixes it | **Yes** — hard failure |
| Removes existing `node_modules` | No | **Always** |
| Version pinning | Semver ranges | Exact lockfile versions |
| Adds packages interactively | Yes | No |

---

## When to use which

**Use `npm ci` when:**
- Running in CI/CD pipelines (GitHub Actions, Jenkins, etc.)
- You want **reproducible builds** — same bits every time
- You want the CI to **catch** accidental lockfile drift before it ships
- Docker image builds

**Use `npm install` when:**
- Developing locally and adding/updating dependencies
- You intentionally want to update the lockfile
- Bootstrapping a project for the first time (no lockfile yet)

---

## The key insight

`npm ci` treats the lockfile as **the source of truth** and fails loudly when reality diverges from it. That's exactly what you want in CI — it catches the scenario where a dev committed a `package.json` change but forgot to commit the updated `package-lock.json`.

In short: **always use `npm ci` in CI, `npm install` in local dev.**