<!-- after / full-stack-developer / so-107390-post-vs-put / run 1 -->

**Duration**: 47.1s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /PUT\s+(is\s+)?idempotent/i | output did not match /(multiple|repeated|same)\s+PUT(\s+requests?)?\s+(produce|result\s+in|leave)\s+(the\s+)?same\s+(state|result|effect)/i | output did not match /(safe|safer)\s+to\s+(retry|repeat)/i

---
Here's the breakdown:

---

## POST vs PUT vs PATCH

All three send data in the body — the difference is **intent** and **idempotency**.

### POST — Create (server assigns the ID)
```http
POST /articles
{ "title": "Hello", "body": "..." }
→ 201 Created  /articles/42   ← server picked the ID
```
- **Not idempotent:** calling it twice creates two resources.
- Use when the server controls the identifier.

### PUT — Full Replace (you know the ID)
```http
PUT /articles/42
{ "title": "Updated", "body": "...", "author": "Alice" }
→ 200 OK  (entire resource replaced)
```
- **Idempotent:** sending it 10 times = same result as once.
- **Omitting a field deletes it** — PUT means "this is the new complete state."
- Use for full replacement or upsert when the client owns the ID.

### PATCH — Partial Update
```http
PATCH /articles/42
{ "title": "Just changing the title" }
→ 200 OK  (only title changed, everything else untouched)
```
- **Usually idempotent** in practice.
- Use when updating one or a few fields without resending the whole object.

---

## Why it matters

| | POST | PUT | PATCH |
|---|---|---|---|
| Idempotent? | No | Yes | Usually |
| Missing fields | N/A | Deleted | Untouched |
| URL has ID? | No | Yes | Yes |

**Idempotency = retry safety.** If a network request times out:
- Retrying a PUT/PATCH is safe — same result.
- Retrying a POST may create a duplicate (e.g., two charges on a payment).

**Practical rule:**
```
Creating, server picks ID   →  POST  /resources
Full replace / upsert       →  PUT   /resources/{id}
Update one or two fields    →  PATCH /resources/{id}
```

The most common mistake is using POST for updates, or PUT when you only intend a partial update. It works at the transport level, but breaks retry logic and misleads API consumers.