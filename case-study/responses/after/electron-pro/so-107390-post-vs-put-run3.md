<!-- after / electron-pro / so-107390-post-vs-put / run 3 -->

**Duration**: 46.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /POST\s+(is\s+)?(not\s+idempotent|non[- ]?idempotent)/i | output did not match /POST.*creates?\s+(a\s+)?new\s+resource/i | output did not match /(repeated\s+POST|each\s+POST)\s+(creates?|may\s+create)\s+(a\s+)?new/i

---
Here's the full breakdown from the agent:

---

## POST vs PUT vs PATCH

All three send data in the body, but they differ in **intent** and **idempotency** — not in mechanics.

---

### The Core Difference

| Method | Meaning | Idempotent? |
|--------|---------|-------------|
| **POST** | "Create something new, server decides the URI" | No |
| **PUT** | "Replace the entire resource at this URI" | Yes |
| **PATCH** | "Apply a partial update to this resource" | Usually |

---

### Create a new resource → **POST**

```
POST /articles
Body: { "title": "Hello", "content": "..." }
→ 201 Created, Location: /articles/42
```

The server assigns the ID. Calling it twice creates **two** articles.

---

### Update an existing resource → **PUT** (full replace) or **PATCH** (partial)

```
# Full replace — you must send every field
PUT /articles/42
Body: { "title": "Hello", "content": "Updated", "author": "Ada" }

# Partial update — send only what changes
PATCH /articles/42
Body: { "title": "New Title" }
```

**PUT gotcha:** If you omit `author` from the body, it gets wiped. PUT means full replacement.

---

### Why it matters: **Idempotency**

PUT is idempotent — calling it 10 times has the same result as calling it once. POST is not — a timed-out request you retry could create a duplicate record (e.g., two orders, two payments).

This affects:
- **Safe retry logic** — you can retry a PUT on network failure; retrying a POST is dangerous
- **Infrastructure behavior** — proxies and clients understand idempotency semantics
- **API clarity** — method choice signals intent to every consumer

---

### Decision Guide

```
Do you know the resource URI before the request?
├─ No  → POST  (server assigns the ID)
└─ Yes → Replacing everything? → PUT
          Changing a few fields? → PATCH
```