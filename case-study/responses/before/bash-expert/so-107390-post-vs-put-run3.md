<!-- before / bash-expert / so-107390-post-vs-put / run 3 -->

**Duration**: 51.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a clear breakdown of the differences:

---

## POST vs PUT vs PATCH

Even though all three send data in the request body, they have very different **semantics**.

### The Core Distinction

| Method | Purpose | Idempotent? | Who picks the ID? |
|--------|---------|-------------|-------------------|
| `POST` | Create a new resource | No | The **server** |
| `PUT` | Replace an entire resource | Yes | The **client** |
| `PATCH` | Partially update a resource | Usually | Client (resource must exist) |

---

### Which to Use and Why

**Creating a new resource → `POST`**
```
POST /api/users
{ "name": "Alice", "email": "alice@example.com" }

→ 201 Created
← Location: /api/users/42
```
The server assigns the ID. Calling this twice creates **two users** — it is not safe to retry blindly.

**Replacing an entire resource → `PUT`**
```
PUT /api/users/42
{ "name": "Alice Smith", "email": "alice@new.com", "status": "active" }
```
You must send the **full resource**. Calling this 10 times gives the same result as calling it once — that's **idempotency**.

**Partial update → `PATCH`**
```
PATCH /api/users/42
{ "email": "alice@new.com" }
```
Only the specified fields change. Everything else stays the same.

---

### Why Does It Matter?

**Idempotency is the real answer.** If a network request fails and you retry it:

- `PUT` → safe to retry. The resource ends up in the same state.
- `POST` → **not safe** to retry. You might create duplicates (imagine double-charging a payment).
- `PATCH` → usually safe, but depends on the operation (e.g., `{"increment": 1}` is not safe to retry).

This matters for **reliability, caching, and system design** — HTTP clients, proxies, and load balancers all treat these methods differently based on these semantics.

---

**Rule of thumb:**
- New resource, server picks ID → `POST`
- Full replacement, you know the ID → `PUT`
- Small update, don't want to resend everything → `PATCH`