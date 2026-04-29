<!-- after / full-stack-developer / so-107390-post-vs-put / run 2 -->

**Duration**: 62.0s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 61.97s > 60s

---
Here is a clear breakdown:

---

## POST vs PUT vs PATCH — What Actually Makes Them Different

All three send data in the body, but they communicate **different intent** to the server.

---

### The Core Semantic Difference

| Method | Meaning | Who picks the URI? |
|--------|---------|-------------------|
| **POST** | "Create something, you decide where it lives" | Server assigns the ID |
| **PUT** | "Store this exact, complete representation at this URI" | Client specifies the URI |
| **PATCH** | "Apply only these changes to the resource at this URI" | Client specifies the URI |

---

### Which to Use When

**Creating a new resource → POST**
```
POST /users
Body: { "name": "Alice", "email": "alice@example.com" }

→ 201 Created
→ Location: /users/42
```
The server picks `id: 42`. The client didn't know what ID it would get.

**Full replacement of an existing resource → PUT**
```
PUT /users/42
Body: { "name": "Alice", "email": "new@example.com", "role": "admin" }
```
You must send the **entire object**. Fields you omit get wiped.

**Partial update → PATCH**
```
PATCH /users/42
Body: { "email": "new@example.com" }
```
Only the email changes. Everything else is untouched.

---

### Why It Matters: Idempotency

This is the real reason it's not just a style choice.

**PUT and PATCH are idempotent** — calling them 10 times in a row produces the same result as calling them once. HTTP clients, load balancers, and proxies are allowed to **automatically retry** idempotent requests on network failure.

**POST is not idempotent** — every call is a new action. If the network retries a POST, you get **duplicate records**: two users, two orders, two charges on a credit card.

---

### Common Bugs From Using the Wrong Method

- **Using PUT for partial updates** → accidental data loss. If you send only `{ "email": "..." }` via PUT, a correct server implementation wipes every other field.
- **Using POST for updates** → broken retry safety. Side effects (emails, payments, audit logs) fire again on every retry.
- **Using POST for creation without deduplication** → ghost/duplicate records when the browser retries after a timeout.

---

**Short rule:** POST creates (server assigns ID, not retry-safe). PUT replaces completely (client knows URI, retry-safe). PATCH updates partially (client knows URI, usually retry-safe).