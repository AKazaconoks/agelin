<!-- after / bash-expert / so-107390-post-vs-put / run 2 -->

**Duration**: 32.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /PUT\s+(is\s+)?idempotent/i | output did not match /(multiple|repeated|same)\s+PUT(\s+requests?)?\s+(produce|result\s+in|leave)\s+(the\s+)?same\s+(state|result|effect)/i | output did not match /(safe|safer)\s+to\s+(retry|repeat)/i

---
Here's what the agent explained:

---

## POST vs PUT vs PATCH

All three send data in the body — the difference is **semantics and idempotency**.

### For creating a new resource: **POST**
- The server decides the new resource's ID/URL
- You don't know the final location beforehand
- **Not idempotent** — calling it twice creates two resources

### For updating an existing resource: **PUT** or **PATCH**
- **PUT** — replaces the *entire* resource. You must send the full object. Calling it multiple times has the same result (idempotent).
- **PATCH** — updates *only the fields you specify*. More efficient for large resources with small changes.

---

### Why idempotency matters

| Method | Idempotent? | Effect of retrying |
|--------|-------------|---------------------|
| POST   | No          | Creates a duplicate |
| PUT    | Yes         | Same result every time |
| PATCH  | Usually     | Depends on the operation |

**Infrastructure cares about this.** Load balancers, proxies, and HTTP clients may automatically retry `PUT` requests on failure (safe to do). They will *not* auto-retry `POST` (could cause duplicates). If you use `POST` for updates, you're lying to the infrastructure.

---

### Quick rule of thumb

- `POST /articles` → create a new article (server picks the ID)
- `PUT /articles/42` → replace article 42 entirely
- `PATCH /articles/42` → update one or two fields on article 42