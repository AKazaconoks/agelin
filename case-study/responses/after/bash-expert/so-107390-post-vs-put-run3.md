<!-- after / bash-expert / so-107390-post-vs-put / run 3 -->

**Duration**: 38.7s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /PUT\s+(is\s+)?idempotent/i | output did not match /(multiple|repeated|same)\s+PUT(\s+requests?)?\s+(produce|result\s+in|leave)\s+(the\s+)?same\s+(state|result|effect)/i | output did not match /(safe|safer)\s+to\s+(retry|repeat)/i

---
Here's the breakdown:

---

## POST vs PUT vs PATCH

All three send data in the body — the difference is **what they're supposed to do with it** and **idempotency**.

### The Core Distinction

| Method | Intent | Who picks the ID? | Idempotent? |
|--------|--------|--------------------|-------------|
| `POST` | Create a new resource | Server | No |
| `PUT` | Replace entire resource | Client | Yes |
| `PATCH` | Partially update a resource | Client | Yes |

---

### POST — for creating

```http
POST /users
{"name": "Alice", "email": "alice@example.com"}

→ 201 Created
   Location: /users/42      ← server assigned the ID
```

Every time you repeat this request, **a new resource is created**. That's by design — and it's what "non-idempotent" means.

---

### PUT — for full replacement

```http
PUT /users/42
{"name": "Alice Smith", "email": "alice.smith@example.com"}
```

This **replaces the whole resource**. Fields you omit get removed or reset. Repeating it gives the same result — that's idempotency.

---

### PATCH — for partial update

```http
PATCH /users/42
{"name": "Alice Smith"}    ← only update the name
```

Only the specified fields change. Everything else is left alone.

---

### Why It Matters

**The biggest practical risk is idempotency:**

- If a network request fails and you retry a `POST`, you might create **duplicate resources**. That's often catastrophic (duplicate orders, payments, etc.).
- If you retry a `PUT` or `PATCH`, you just get the same end state — safe.

**The other risk is accidental data loss with PUT:**

- If you send a `PUT` but forget to include a field (say, `active: true`), that field gets wiped out.
- `PATCH` avoids this — only what you send gets changed.

---

### Rule of thumb

- **Creating something new** → `POST /resources`
- **Replacing an entire resource** → `PUT /resources/{id}`
- **Updating specific fields** → `PATCH /resources/{id}`