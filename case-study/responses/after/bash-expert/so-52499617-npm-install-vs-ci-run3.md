<!-- after / bash-expert / so-52499617-npm-install-vs-ci / run 3 -->

**Duration**: 43.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a comprehensive breakdown:

## `npm install` vs `npm ci`

### Core Difference

| Behavior | `npm install` | `npm ci` |
|---|---|---|
| Reads `package-lock.json` | As a guide (may update it) | As the **sole source of truth** |
| Writes `package-lock.json` | Yes, may modify it | **Never** |
| Requires lockfile | No (creates one if missing) | **Yes** (fails without it) |
| Cleans `node_modules` first | No (incremental) | **Yes** (full wipe + reinstall) |
| Fails on lockfile mismatch | No (reconciles) | **Yes** |

### Speed

**`npm ci` is typically 2–10x faster in CI** because it skips version resolution entirely — it reads exact versions directly from the lockfile and bypasses interactive features like audit messages.

### Reproducibility

`npm ci` gives you a **byte-for-byte identical install every run**. `npm install` can silently drift if the lockfile is stale or a new patch release lands on the registry.

### When to use which

**Use `npm ci`** in:
- CI/CD pipelines (GitHub Actions, Jenkins, etc.)
- Docker image builds
- Production deployments
- Anywhere reproducibility matters

**Use `npm install`** when:
- Adding/updating dependencies locally
- Initial project setup
- You need to modify the lockfile intentionally

### Key gotchas

1. **Always commit `package-lock.json`** — `npm ci` will fail without it.
2. If `package.json` and `package-lock.json` are out of sync (e.g., someone manually edited `package.json`), `npm ci` will **error**. This is intentional — it forces you to keep them consistent.
3. In monorepos with npm workspaces, behavior can differ slightly.

### TL;DR

Use `npm ci` in CI. It's faster, stricter, and guarantees the same install every time. Use `npm install` locally when you're actively managing dependencies.