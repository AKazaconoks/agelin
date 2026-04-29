<!-- before / bash-expert / so-107390-post-vs-put / run 1 -->

**Duration**: 38.1s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /PUT\s+(is\s+)?idempotent/i | output did not match /(multiple|repeated|same)\s+PUT(\s+requests?)?\s+(produce|result\s+in|leave)\s+(the\s+)?same\s+(state|result|effect)/i | output did not match /(safe|safer)\s+to\s+(retry|repeat)/i

---
Here's the breakdown:

---

## POST vs PUT vs PATCH — What Actually Makes Them Different

They all send data in the body, but the **semantic intent** is completely different.

---

### The Short Answer

| Method | Purpose | Idempotent? |
|--------|---------|-------------|
| **POST** | Create a new resource (server assigns ID) | No |
| **PUT** | Create or **fully replace** a resource at a known URL | Yes |
| **PATCH** | **Partially update** an existing resource | Usually yes |

---

### Idempotency — Why It Matters

This is the key concept. An operation is **idempotent** if doing it 10 times has the same result as doing it once.

- `POST /users` 10 times → creates **10 different users** (not idempotent)
- `PUT /users/123` 10 times → user 123 is in the **same final state** every time (idempotent)

This matters for **retry logic** — if a network request fails, can you safely retry it? With PUT/PATCH, yes. With POST, you might accidentally create duplicates.

---

### Which to Use and When

**Creating a new resource → POST**
```http
POST /users
{"name": "Jane", "email": "jane@example.com"}

→ Server responds: 201 Created, Location: /users/456
```
You don't know the ID yet — the server assigns it.

**Fully replacing a resource → PUT**
```http
PUT /users/456
{"name": "Jane Smith", "email": "jane.smith@example.com", "phone": "555-0100"}
```
This **replaces the entire resource**. Any field you omit gets reset to its default. This is a footgun if you only meant to change one field.

**Partially updating a resource → PATCH**
```http
PATCH /users/456
{"email": "new@example.com"}
```
Only the `email` changes. Everything else stays as-is. This is what you almost always want for updates.

---

### The Common Mistake

Using `PUT` when you mean `PATCH`:

```http
PUT /users/456
{"email": "new@example.com"}

// ⚠️ This might wipe out the user's name, phone, and other fields!
```

---

**Bottom line:**
- **POST** to create (server picks the ID)
- **PUT** only when you want to fully replace an entire resource
- **PATCH** for partial updates — this is your everyday update method