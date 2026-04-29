<!-- before / full-stack-developer / so-1789945-string-contains-substring / run 2 -->

**Duration**: 20.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the summary:

---

## Checking for a Substring in JavaScript

### Modern (ES6+) — `String.prototype.includes()`

```javascript
"Hello, world!".includes("world");       // true
"Hello, world!".includes("world", 8);    // false — optional start index
```

Prefer this. Returns a boolean, reads naturally.

---

### Legacy approaches you'll still see

**`indexOf()` — the pre-ES6 standard:**
```javascript
"Hello, world!".indexOf("world") !== -1;  // true
```
Also useful when you actually need the position, not just presence.

**`RegExp.test()` — for pattern/case-insensitive checks:**
```javascript
/world/i.test("Hello, World!");  // true (case-insensitive)
```
Overkill for plain substring checks, but appropriate when you need regex semantics.

---

**Rule of thumb:** use `includes()` by default, `indexOf()` when you need the position or are targeting old environments, and regex only when you actually need pattern matching.