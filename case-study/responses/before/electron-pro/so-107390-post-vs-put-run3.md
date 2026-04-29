<!-- before / electron-pro / so-107390-post-vs-put / run 3 -->

**Duration**: 44.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a breakdown of the three HTTP methods that all send data in the body:

---

### The Core Difference: Intent & Idempotency

| Method | Intent | Idempotent | Partial Update |
|--------|--------|-----------|----------------|
| **POST** | Create a new resource (server assigns ID) | No | N/A |
| **PUT** | Replace a resource entirely (client knows the ID) | Yes | No |
| **PATCH** | Partially update a resource | No* | Yes |

*PATCH isn't guaranteed idempotent by spec, but can be designed that way.

---

### Which to Use When

**POST → Create (server assigns the ID)**
```http
POST /users
{ "name": "Alice", "email": "alice@example.com" }

→ 201 Created
   Location: /users/42
```
The server picks the new resource's ID. Calling this 10 times creates 10 users — **not safe to blindly retry**.

**PUT → Full replacement (you know the ID)**
```http
PUT /users/42
{ "name": "Alice Updated", "email": "new@example.com", "role": "admin" }

→ 200 OK
```
You must send the **entire resource**. Omit a field and it gets cleared. Safe to retry — calling it 10 times leaves the resource in the same state.

**PATCH → Partial update (only what changes)**
```http
PATCH /users/42
{ "email": "new@example.com" }

→ 200 OK
```
Only touched fields change. `name`, `role`, everything else stays untouched.

---

### Why It Matters

1. **Retry safety** — A `PUT` retry is harmless. A `POST` retry creates duplicates. Load balancers and API gateways may retry on timeout — knowing idempotency tells you if that's safe.
2. **Concurrency** — Two clients racing to `PUT` a full object will clobber each other's changes. `PATCH` narrows the conflict window.
3. **API clarity** — `PUT` signals "send me complete state." `PATCH` signals "send me a diff." Unambiguous for clients.

---

### Decision Tree

```
Do you have the resource's ID?
├── No  → POST  (server creates it and returns the ID)
└── Yes → Are you replacing everything?
           ├── Yes → PUT   (full replacement, safe to retry)
           └── No  → PATCH (targeted field update)
```