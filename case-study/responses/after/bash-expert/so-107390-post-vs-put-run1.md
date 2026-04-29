<!-- after / bash-expert / so-107390-post-vs-put / run 1 -->

**Duration**: 36.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /PUT\s+(is\s+)?idempotent/i | output did not match /(multiple|repeated|same)\s+PUT(\s+requests?)?\s+(produce|result\s+in|leave)\s+(the\s+)?same\s+(state|result|effect)/i | output did not match /(safe|safer)\s+to\s+(retry|repeat)/i

---
Great summary from the agent. Here's the breakdown:

---

## POST vs PUT vs PATCH

They all send data in the body — but the **semantics and idempotency** are what set them apart.

### The Core Rule

| Method | Purpose | Idempotent? |
|--------|---------|-------------|
| `POST` | **Create** a new resource | No |
| `PUT` | **Fully replace** an existing resource | Yes |
| `PATCH` | **Partially update** an existing resource | Usually no |

---

### Use `POST` to Create

```
POST /users
{ "name": "Alice", "email": "alice@example.com" }
```

- The **server assigns the ID** and returns it (e.g., `201 Created` + `Location: /users/456`)
- **Non-idempotent**: calling it 3 times creates 3 separate users

---

### Use `PUT` to Fully Replace

```
PUT /users/456
{ "name": "Alice B.", "email": "new@example.com" }
```

- The **client knows the resource's ID** and sends the complete new state
- **Idempotent**: calling it 3 times leaves the resource in the same final state
- Missing fields typically get wiped/defaulted — it's a full replacement

---

### Use `PATCH` for Partial Updates

```
PATCH /users/456
{ "name": "Alice B." }
```

- Only the provided fields are changed; everything else stays the same

---

### Why It Matters

**Idempotency** is the real practical difference:

- If a `PUT` or `PATCH` request fails mid-flight, the client can **safely retry** it — the result is the same.
- If a `POST` fails, the client **cannot blindly retry** — it might create a duplicate resource.
- HTTP infrastructure (proxies, CDNs, load balancers) also uses these semantics for caching and retry behavior.

**Bottom line:** Use `POST` when the server generates the resource identity, `PUT` when you're replacing the whole thing and you know the ID, and `PATCH` when you're tweaking specific fields.