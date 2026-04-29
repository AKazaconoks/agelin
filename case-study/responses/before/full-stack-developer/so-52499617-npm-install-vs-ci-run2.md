<!-- before / full-stack-developer / so-52499617-npm-install-vs-ci / run 2 -->

**Duration**: 42.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(use\s+)?npm\s+ci\s+(in|for)\s+(ci|continuous\s+integration|production|build)/i | output did not match /(reproducib(le|ility)|deterministic|consistent)/i

---
Here's a comprehensive breakdown:

---

## `npm install` vs `npm ci`

### How They Work Differently

**`npm install`**
- Reads `package.json` to resolve dependencies
- Uses `package-lock.json` as a *hint*, but **can update it** if semver ranges resolve differently
- Updates `node_modules` incrementally — doesn't wipe it first
- Can silently change your lockfile as a side effect

**`npm ci`**
- Reads `package-lock.json` as the *sole source of truth*
- **Always deletes `node_modules`** before installing — every run is a clean slate
- **Fails immediately** if `package.json` and `package-lock.json` are out of sync
- **Never modifies** `package-lock.json`

---

### Is `npm ci` Faster?

**Generally yes**, for a specific reason: it skips dependency resolution entirely. The lockfile already contains the exact version, registry URL, and integrity hash for every package — so it goes straight to downloading and extracting.

The biggest gains appear when:
- **CI caches `~/.npm`** between runs — `npm ci` can skip network requests almost entirely
- **Large dependency trees** — skipping resolution compounds with tree size

---

### Does `npm ci` Make Tests More Reliable?

**Yes — this is its most important CI property.**

With `npm install`, if your `package.json` says `"lodash": "^4.17.0"`, it might resolve to `4.17.15` today and `4.17.21` six months from now. Your tests pass today; a silent version bump causes a subtle failure weeks later with nothing in your source code changed.

`npm ci` eliminates this entirely:
- **Every run installs the exact same versions** — identical `node_modules` across all developers and all CI runs
- **Integrity checking is strict** — verifies SHA-512 hashes for every downloaded package; tampered/corrupted packages cause hard failures
- **Lockfile is protected** — you can't accidentally commit lockfile drift as a CI side effect

---

### When to Use Each

| Situation | Command |
|---|---|
| Adding/updating/removing packages locally | `npm install` |
| First-time project setup, no lockfile yet | `npm install` |
| CI pipelines, CD, Docker builds | `npm ci` |
| Production artifact builds | `npm ci` |
| Debugging "works on my machine" issues | `npm ci` |

**The practical rule:**
> If a *human* is actively managing dependencies → `npm install`
> If a *machine* is reproducing a known-good state → `npm ci`

**Typical workflow:** developers use `npm install` locally, commit the updated `package-lock.json`, then every CI job uses `npm ci` to enforce that locked state. The lockfile is the contract; `npm ci` is the enforcement mechanism.