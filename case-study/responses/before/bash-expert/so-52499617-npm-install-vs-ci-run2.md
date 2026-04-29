<!-- before / bash-expert / so-52499617-npm-install-vs-ci / run 2 -->

**Duration**: 38.3s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(use\s+)?npm\s+ci\s+(in|for)\s+(ci|continuous\s+integration|production|build)/i | output did not match /(reproducib(le|ility)|deterministic|consistent)/i

---
Here's a comprehensive breakdown:

## `npm ci` vs `npm install`

| Aspect | `npm install` | `npm ci` |
|--------|---------------|----------|
| **Lockfile handling** | May update `package-lock.json` | Never modifies it |
| **Version resolution** | Resolves semver ranges from `package.json` | Uses exact versions from lockfile |
| `node_modules` | Preserves existing, installs missing | Completely wipes and recreates |
| **Speed** | Slower (dependency resolution) | Faster (~30-50%) |
| **Determinism** | Can vary between runs | Always identical |
| **Lockfile requirement** | Optional | Required (fails without it) |

## Is `npm ci` faster?

**Yes, significantly.** It skips dependency resolution entirely (versions are already locked), can parallelize downloads immediately, and never writes lockfile changes. Expect **30–50% faster** installs in CI environments.

## Does it make tests harder?

**No — it makes them more reliable.** It eliminates "works on my machine" issues by guaranteeing the exact same dependency tree on every run. It also *catches* lockfile drift (fails if `package.json` and `package-lock.json` are out of sync), which is a feature, not a bug.

## When to use which

**Use `npm ci` for:**
- CI/CD pipelines (its primary purpose)
- Production deployments
- Docker builds
- Any automated environment

**Use `npm install` for:**
- Local development
- Adding or updating dependencies
- Initial setup when no lockfile exists

## Golden rule

> **`npm install` in development, `npm ci` in automation.**

```yaml
# GitHub Actions example
- name: Install dependencies
  run: npm ci       # not npm install

- name: Run tests
  run: npm test
```

One prerequisite: make sure `package-lock.json` is committed to your repo — `npm ci` requires it and will fail without it.