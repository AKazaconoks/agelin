<!-- after / electron-pro / so-107390-post-vs-put / run 2 -->

**Duration**: 59.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /POST\s+(is\s+)?(not\s+idempotent|non[- ]?idempotent)/i | output did not match /POST.*creates?\s+(a\s+)?new\s+resource/i | output did not match /(repeated\s+POST|each\s+POST)\s+(creates?|may\s+create)\s+(a\s+)?new/i

---
Here's what makes them different — even though all three send data in the body:

---

## POST vs PUT vs PATCH

### The key difference: intent + idempotency

**Idempotency** means: calling the operation N times produces the same result as calling it once.

| Method | Idempotent? | Use for |
|--------|-------------|---------|
| `POST` | No | **Creating** a new resource (server assigns the ID) |
| `PUT` | Yes | **Fully replacing** an existing resource (you supply the complete object) |
| `PATCH` | Usually yes | **Partially updating** an existing resource (only changed fields) |

---

### POST — Create

```http
POST /api/orders
{ "product_id": "sku-99", "quantity": 2 }
```
- Server picks the ID and returns it in `Location: /api/orders/1042`
- **Not safe to retry blindly** — sending it twice creates two orders

### PUT — Full replacement

```http
PUT /api/orders/1042
{ "product_id": "sku-99", "quantity": 5, "status": "pending", "address": "123 Main" }
```
- You must send the **complete** object — missing fields get nulled out
- Safe to retry; calling it 3 times leaves the resource in the same state

### PATCH — Partial update

```http
PATCH /api/orders/1042
{ "quantity": 5 }
```
- Only the fields you send are changed; everything else is untouched
- Safer than PUT when you don't have the full object

---

### Why it matters

1. **Retry safety** — a network timeout on a `POST` may have created a duplicate. A `PUT`/`PATCH` is safe to retry.
2. **Data loss bug with PUT** — if you `PUT` a partial object (e.g., you forgot to include `role: "admin"`), that field gets wiped silently. `PATCH` avoids this.
3. **Cache invalidation** — `PUT /users/7` tells caches exactly which resource changed. `POST /users/update` gives them nothing to work with.

---

**Rule of thumb:**
- Don't know the ID yet → `POST` to the collection
- Know the ID, have the full object → `PUT` to the resource
- Know the ID, only have changed fields → `PATCH` to the resource