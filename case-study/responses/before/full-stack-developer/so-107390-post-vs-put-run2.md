<!-- before / full-stack-developer / so-107390-post-vs-put / run 2 -->

**Duration**: 49.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a clear breakdown:

---

## POST vs PUT vs PATCH

All three send data in the body, but their **semantics** are completely different.

| Method | Purpose | Idempotent | Updates partial fields |
|--------|---------|------------|------------------------|
| `POST` | Create (server picks the ID) | No | No |
| `PUT` | Replace entirely (you know the ID) | Yes | No |
| `PATCH` | Update specific fields only | No* | Yes |

---

## Use POST to create a new resource

```js
// You don't know the ID yet — server will generate it
fetch('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
});
// Server responds: 201 Created, Location: /api/users/42
```

The URL is a **collection** (`/users`), and the server assigns the new ID.

---

## Use PUT or PATCH to update an existing one

**PUT** = full replacement. You must send **every field**, or missing ones may be nulled out:

```js
fetch('/api/users/42', {
  method: 'PUT',
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com', role: 'admin' })
  // Omit 'role' here and it might get wiped to null
});
```

**PATCH** = partial update. Only send what you want to change:

```js
fetch('/api/users/42', {
  method: 'PATCH',
  body: JSON.stringify({ role: 'viewer' }) // name and email are untouched
});
```

---

## Why does it matter? Idempotency.

- **POST is not idempotent** — retrying a timed-out POST can create duplicates (two users named Alice).
- **PUT is idempotent** — retrying it 10 times has the same result as calling it once, so it's safe for retry logic, proxies, and offline queues.

**The decision rule:**

```
Know the ID? No  → POST to the collection
Know the ID? Yes → Replacing everything? PUT
                   Changing a few fields? PATCH
```