<!-- before / full-stack-developer / so-52499617-npm-install-vs-ci / run 3 -->

**Duration**: 70.6s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 70.56s > 60s

---
Here's a comprehensive breakdown of `npm install` vs `npm ci`:

---

## The Core Distinction

**`npm install`** resolves and installs dependencies, potentially updating `package-lock.json`.
**`npm ci`** installs *exactly* what's in `package-lock.json` — no resolution, no modifications, no surprises.

---

## Key Behavioral Differences

| Behavior | `npm install` | `npm ci` |
|---|---|---|
| Source of truth | `package.json` + lock file | `package-lock.json` **only** |
| Modifies lock file | Yes, if out of sync | **Never** |
| Cleans `node_modules` first | No | **Yes, always** |
| Requires lock file | No | **Yes — errors without it** |
| Mismatched lock file | Silently updates | **Hard error** |

---

## Is `npm ci` faster?

**Yes, in CI (cold starts).** It skips the entire dependency resolution step and never writes back to the lock file. On a typical medium-sized project, you'll see 30–40% speedup on cold cache runs.

On a warm local machine with existing `node_modules`, `npm install` can actually be faster since it only installs what changed. `npm ci` always nukes and rebuilds.

---

## Does it make tests more reliable?

**Absolutely yes.** This is the primary reason to use it. Without `npm ci`, your test suite can silently run against different package versions across runs:

```
Monday:  Tests pass ✓  (express@4.18.1 installed)
Tuesday: Tests fail ✗  (express@4.18.2 released overnight)
```

With `npm ci`, every CI run installs the *exact same versions*, forever, until you explicitly update the lock file. A test failure always means a code change caused it — never a silent dependency shift.

---

## When to use which

**Use `npm install` locally** when adding/updating packages:
```bash
npm install axios          # adds dependency, updates lock file
npm update                 # updates packages within semver ranges
```

**Use `npm ci` everywhere automated:**
```yaml
# GitHub Actions
- name: Install dependencies
  run: npm ci              # NOT npm install

- name: Run tests
  run: npm test
```

```dockerfile
# Dockerfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev      # reproducible, no devDeps in prod
```

---

## Critical Gotchas

1. **Commit your `package-lock.json`** — `npm ci` is useless without it in version control. Remove it from `.gitignore` if it's there.

2. **Cache `~/.npm`, not `node_modules`** — since `npm ci` deletes `node_modules` on every run, caching it is wasteful. Cache the npm tarball cache instead:
   ```yaml
   - uses: actions/setup-node@v4
     with:
       cache: 'npm'   # caches ~/.npm correctly
   ```

3. **`npm ci` is all-or-nothing** — you can't use it to install a single package. Always use `npm install <pkg>` locally, then commit the updated lock file.

---

**One-sentence rule:** `npm install` is for *changing* your dependencies; `npm ci` is for *reproducibly installing* them.