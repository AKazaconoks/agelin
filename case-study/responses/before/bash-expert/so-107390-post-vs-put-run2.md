<!-- before / bash-expert / so-107390-post-vs-put / run 2 -->

**Duration**: 50.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## POST vs PUT vs PATCH — They're Not the Same

Even though all three send data in the body, **the semantics are completely different.**

---

### The Core Difference: Who controls the URL?

| Method | Who picks the resource location | Effect |
|--------|--------------------------------|--------|
| **POST** | The **server** picks it | Creates a new resource at a server-assigned URL |
| **PUT** | The **client** picks it | Creates or fully replaces the resource at that exact URL |
| **PATCH** | N/A (resource must exist) | Partially updates an existing resource |

---

### Creating a resource → use POST

```bash
POST /api/users
{"name": "Alice", "email": "alice@example.com"}

# 201 Created
# Location: /api/users/456    ← server chose the ID
```

---

### Updating a resource → use PUT (full) or PATCH (partial)

```bash
# Full replacement — must send ALL fields
PUT /api/users/456
{"name": "Alice Smith", "email": "alice@example.com", "role": "admin"}

# Partial update — only send what you're changing
PATCH /api/users/456
{"role": "admin"}
```

---

### Why it matters: **Idempotency**

This is the real reason the distinction exists.

- **PUT is idempotent** — calling it 10 times has the same effect as calling it once. Safe to retry automatically.
- **POST is NOT idempotent** — calling it 10 times creates **10 separate resources**. Retrying a failed POST can cause duplicates.
- **PATCH** — depends on implementation (absolute sets are idempotent; relative increments like `+1` are not).

Proxies, load balancers, and HTTP clients all rely on these semantics to decide whether they can safely retry a failed request. Breaking the convention silently breaks that infrastructure.

---

### Quick rule of thumb

> - **Don't know the ID yet?** → `POST /resources`
> - **Know the ID, replacing everything?** → `PUT /resources/123`
> - **Know the ID, changing a few fields?** → `PATCH /resources/123`