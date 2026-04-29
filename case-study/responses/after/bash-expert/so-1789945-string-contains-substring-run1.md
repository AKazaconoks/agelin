<!-- after / bash-expert / so-1789945-string-contains-substring / run 1 -->

**Duration**: 21.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the summary:

---

## Checking if a string contains a substring in JavaScript

**Modern (ES6+) — use this:**
```javascript
"Hello, world!".includes("world"); // true
```
`String.prototype.includes()` returns a boolean directly. Clear and idiomatic.

---

**Legacy — what you'll see in older code:**

```javascript
// indexOf: returns position, or -1 if not found
"Hello, world!".indexOf("world") !== -1; // true

// Regex: useful when matching patterns, overkill for literals
/world/.test("Hello, world!"); // true
```

---

**Quick rule of thumb:** Use `includes()` for all new code. Reach for `indexOf()` when you actually need the *position* of the match, not just a yes/no answer.