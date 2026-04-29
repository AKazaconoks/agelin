<!-- after / electron-pro / so-107390-post-vs-put / run 1 -->

**Duration**: 40.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## POST vs PUT vs PATCH

All three send a body. The difference is **semantics, idempotency, and who owns the resource identifier**.

### Semantics

| Method | Meaning | Who picks the URL? |
|--------|---------|-------------------|
| `POST` | "Here is data — you figure out what to do with it." Creates a new resource; the server assigns the ID. | **Server** |
| `PUT` | "Replace whatever is at this URL with exactly what I'm sending." Full replacement. | **Client** |
| `PATCH` | "Apply this partial change to whatever is at this URL." Partial update only. | **Client** |

---

### Idempotency — Why It Matters

An operation is **idempotent** if calling it N times produces the same result as calling it once.

| Method | Idempotent? | Why |
|--------|------------|-----|
| `POST` | No | Each call creates a new resource. Send it twice, you get two records. |
| `PUT` | Yes | Replacing a resource with the same data leaves the system in the same state. |
| `PATCH` | Usually no | `{"increment_age": 1}` applied twice gives a different result. |

Networks are unreliable. If a `PUT` times out, you can safely **retry** — the server ends up in the same state. If a `POST` times out and you retry, you risk **duplicate records**.

---

### URL Semantics — Who Decides the ID?

```
POST /users        ← "Create a user; YOU pick the ID"
PUT  /users/42     ← "Replace user 42 entirely; I already know the ID"
PATCH /users/42    ← "Update parts of user 42"
```

---

### Concrete Example

**Create (POST)** — server picks the ID, responds with `201 Created` + `Location: /users/99`

```http
POST /users
{ "name": "Alice", "email": "alice@example.com" }
```

**Full replace (PUT)** — you must send the **complete** representation; omitted fields get wiped

```http
PUT /users/99
{ "name": "Alice Smith", "email": "alice.smith@example.com" }
```

**Partial update (PATCH)** — only the fields you send change; the rest are untouched

```http
PATCH /users/99
{ "email": "newemail@example.com" }
```

---

### Decision Guide

```
Do you know the resource ID before the call?
├── No  → POST   (server creates it and assigns the ID)
└── Yes →
        Are you replacing the entire resource?
        ├── Yes → PUT    (full replacement, safe to retry)
        └── No  → PATCH  (partial update, touch only what changed)
```

**Common mistake:** using `POST /users/99/update` for updates. If you know the ID, use `PUT` or `PATCH` directly on the resource URL.