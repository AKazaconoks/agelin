<!-- before / electron-pro / so-107390-post-vs-put / run 2 -->

**Duration**: 48.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /POST\s+(is\s+)?(not\s+idempotent|non[- ]?idempotent)/i | output did not match /POST.*creates?\s+(a\s+)?new\s+resource/i | output did not match /(repeated\s+POST|each\s+POST)\s+(creates?|may\s+create)\s+(a\s+)?new/i

---
Here's the breakdown from the agent:

---

## POST vs PUT (vs PATCH)

They both carry data in the body, but the **method signals intent** — not just the payload.

### POST — Create (server picks the ID)
```
POST /users
Body: { "name": "Alice" }
← 201 Created  /users/42
```
Every call creates a **new** resource. The server assigns the URL/ID. Fire it 5 times → 5 users.

### PUT — Full replace (client knows the URL)
```
PUT /users/42
Body: { "name": "Alice", "email": "alice@example.com" }
← 200 OK
```
Fire it 5 times → still exactly one `/users/42`, in exactly that state. **Full replacement** — if you omit a field, that field is gone.

### PATCH — Partial update
```
PATCH /users/42
Body: { "email": "new@example.com" }
← 200 OK
```
Only the sent fields change. Everything else stays untouched.

---

## The Key Concept: Idempotency

| Method | Idempotent? | Implication |
|--------|-------------|-------------|
| POST   | No  | Retry on timeout = duplicate record |
| PUT    | Yes | Retry on timeout = safe, same result |
| PATCH  | Usually | Depends on implementation |

This is why it **matters**: when a network request times out and your client retries it, a `PUT` is safe to retry — a `POST` may silently create duplicates.

---

**Rule of thumb:**
- Use **POST** when creating and the server assigns the ID
- Use **PUT** when you're sending the complete, authoritative state of a known resource
- Use **PATCH** when you only want to update specific fields