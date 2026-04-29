<!-- before / full-stack-developer / so-107390-post-vs-put / run 3 -->

**Duration**: 39.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a clear breakdown of what the agent explained:

---

## POST vs PUT vs PATCH

They all send data in the body, but the **semantics** and **who controls the resource identity** are fundamentally different.

| Method | Purpose | URL target | Idempotent? |
|--------|---------|-----------|-------------|
| **POST** | Create a new resource | A collection (`/users`) | No |
| **PUT** | Replace a resource entirely | A specific resource (`/users/42`) | Yes |
| **PATCH** | Partially update a resource | A specific resource (`/users/42`) | Yes |

---

### Creating — use POST

```http
POST /users
{ "name": "Alice", "email": "alice@example.com" }
```

The **server** assigns the ID. Calling this twice creates two users.

---

### Replacing — use PUT

```http
PUT /users/42
{ "name": "Alice Smith", "email": "new@email.com", "role": "admin" }
```

You must send the **complete** resource. Any field you omit gets wiped. Safe to retry.

---

### Partial update — use PATCH

```http
PATCH /users/42
{ "role": "admin" }
```

Only the fields you send are changed. Everything else stays untouched. Most practical for everyday updates.

---

### Why idempotency matters

**POST** is not idempotent — a retry can create duplicate records (duplicate orders, users, etc.). **PUT/PATCH** are idempotent — retrying on a network failure is safe.

**The rule most teams follow: POST to create, PATCH to update.**