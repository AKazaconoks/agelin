<!-- after / full-stack-developer / so-107390-post-vs-put / run 3 -->

**Duration**: 70.7s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 70.74s > 60s

---
Here's the full breakdown:

---

## POST vs PUT vs PATCH — They all have a body, but they mean different things

The mechanics are the same (data in the body), but the **semantic contract** is different. HTTP methods are a promise to the client, browser, proxy, and server about what the request *means*.

---

### The three methods at a glance

| Method | Meaning | Who controls the URL? |
|--------|---------|----------------------|
| **POST** | "Here's data — you decide what to do with it" | Server (it assigns the ID) |
| **PUT** | "Replace whatever is at this exact URL, in full" | Client (you already know the URL) |
| **PATCH** | "Apply this partial change to the resource at this URL" | Client |

---

### For **creating** a new resource → `POST`

```
POST /articles
{ "title": "My Post", "body": "Hello world" }

→ 201 Created
   Location: /articles/42   ← server assigned the ID
```

Use POST when the server generates the new resource's ID. You don't know it yet.

---

### For **updating** an existing resource → `PUT` or `PATCH`

```
# Full replacement — every field must be sent
PUT /articles/42
{ "title": "Updated Title", "body": "New body" }

# Partial update — only send the fields you want to change
PATCH /articles/42
{ "title": "Just the title changed" }
```

**The PUT trap:** if you omit a field, it gets wiped. PUT means *full replacement*. PATCH is the right choice when you only want to touch a few fields.

---

### Why it matters: **Idempotency**

This is the real reason the distinction exists.

- **PUT is idempotent** — sending the same PUT 10 times has the same effect as sending it once. Safe to retry.
- **POST is NOT idempotent** — sending `POST /orders` 10 times creates 10 orders. A network retry = duplicate order = real bug.

Browsers, proxies, load balancers, and HTTP clients all make **automatic retry decisions** based on the method. When you use POST for everything just because "it has a body," you throw away that safety guarantee.

---

### The most common mistake

Using `PUT` when you mean `PATCH`:

```
# Existing resource: { "name": "Alice", "email": "alice@example.com", "role": "admin" }

PUT /users/99
{ "name": "Alice Smith" }   ← forgot to include email and role

# Result: { "name": "Alice Smith", "email": null, "role": null }  ← data wiped silently
```

**Rule of thumb:**
- Don't know the new resource's ID yet → `POST`
- Know the URL, replacing the whole thing → `PUT`
- Know the URL, changing a few fields → `PATCH`