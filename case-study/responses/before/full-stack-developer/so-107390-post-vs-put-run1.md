<!-- before / full-stack-developer / so-107390-post-vs-put / run 1 -->

**Duration**: 51.3s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /POST\s+(is\s+)?(not\s+idempotent|non[- ]?idempotent)/i | output did not match /POST.*creates?\s+(a\s+)?new\s+resource/i | output did not match /(repeated\s+POST|each\s+POST)\s+(creates?|may\s+create)\s+(a\s+)?new/i

---
Here's the full breakdown from the agent:

---

## The Core Difference: Semantics + Idempotency

All three methods (POST, PUT, PATCH) send data in the body, but they carry different **intentions** and have different **idempotency** guarantees.

---

## Which to Use for What

| Situation | Method |
|-----------|--------|
| Create a resource (server assigns the ID) | **POST** |
| Fully replace a resource (client knows the URL) | **PUT** |
| Partially update specific fields | **PATCH** |

### POST — Create (server decides the ID)
```
POST /articles
Body: { "title": "My Article", "content": "..." }
→ 201 Created, Location: /articles/42
```
The server picks the ID. You don't know the final URL before the request.

### PUT — Full Replacement (idempotent)
```
PUT /articles/42
Body: { "title": "New Title", "content": "New content" }
```
This **replaces the entire resource**. Fields you omit are **deleted**. Safe to retry — calling it 10 times gives the same result as calling it once.

### PATCH — Partial Update
```
PATCH /articles/42
Body: { "title": "Just Changing the Title" }
```
Only the fields you send are changed. Everything else is left alone.

---

## Why It Matters: Idempotency

| Method | Idempotent? |
|--------|------------|
| POST   | No — retrying creates duplicates |
| PUT    | Yes — retrying is safe |
| PATCH  | Usually no (depends on design) |

**Real consequence:** If a network request fails and gets retried automatically, a POST can create duplicate orders/users/records. A PUT will not — the result is always the same.

---

## Common Pitfall: PUT vs PATCH for Updates

Given record: `{ "name": "Alice", "email": "alice@example.com", "role": "admin" }`

```
# PUT — DANGEROUS if you forget fields
PUT /users/99
Body: { "name": "Alice", "email": "new@example.com" }
→ "role" is now GONE

# PATCH — Safe partial update
PATCH /users/99
Body: { "email": "new@example.com" }
→ Only email changed, role stays "admin"
```

**Short rule: POST to create, PATCH to partially update, PUT to fully replace.**