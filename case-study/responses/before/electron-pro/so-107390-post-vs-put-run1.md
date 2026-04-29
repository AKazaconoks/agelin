<!-- before / electron-pro / so-107390-post-vs-put / run 1 -->

**Duration**: 45.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the breakdown:

---

## POST vs PUT vs PATCH — What Makes Them Different

They all send data in the body, but they carry different **semantic contracts**.

### The Short Answer

| Goal | Method |
|---|---|
| Create a new resource (server picks the ID) | **POST** |
| Replace an entire resource at a known URL | **PUT** |
| Update only specific fields | **PATCH** |

---

### POST — "Create something, server decides where"

```
POST /articles
Body: { "title": "Hello World" }
→ 201 Created, Location: /articles/42   ← server assigned the ID
```

### PUT — "Replace everything at this exact URL"

```
PUT /articles/42
Body: { "title": "Hello World (revised)", "author": "...", "content": "..." }
→ 200 OK
```

Every field must be present. Omit a field and a correct server implementation may null it out.

### PATCH — "Change only these fields"

```
PATCH /articles/42
Body: { "title": "Hello World (revised)" }
→ 200 OK  (all other fields untouched)
```

---

### Why It Really Matters: Idempotency

This is the key concept. An operation is **idempotent** if calling it 10 times has the same result as calling it once.

| Method | Idempotent? |
|---|---|
| POST | **No** — each call creates a new resource |
| PUT | **Yes** — replacing the same resource with the same body is safe to repeat |
| PATCH | Not guaranteed |

**The practical consequence:** if a POST request times out and the client retries, you get **two records** (e.g., two orders, two charges). If a PUT times out and retries, you're safe — the second call just overwrites with the same data.

---

### Rule of Thumb

- `POST /users` → creates a new user, server assigns the ID
- `PUT /users/7` → replaces user 7 entirely
- `PATCH /users/7` → updates only the fields you send