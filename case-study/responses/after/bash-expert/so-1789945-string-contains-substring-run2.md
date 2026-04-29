<!-- after / bash-expert / so-1789945-string-contains-substring / run 2 -->

**Duration**: 24.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Checking if a String Contains a Substring in JavaScript

### Modern (ES6+) — use this

```javascript
const text = "Hello world";

text.includes("world");        // true
text.includes("World");        // false (case-sensitive)

// Case-insensitive:
text.toLowerCase().includes("world".toLowerCase());
```

`String.prototype.includes()` was added in ES2015. It returns a plain boolean and reads naturally.

---

### Legacy approaches (still common in older codebases)

```javascript
const text = "Hello world";

// indexOf — most prevalent legacy pattern
text.indexOf("world") !== -1;   // true

// search with regex — useful when you need case-insensitive without lowercasing
text.search(/world/i) !== -1;   // true

// match with regex — returns array or null
text.match(/world/i) !== null;  // true
```

**Summary:**

| Method | Returns | Notes |
|---|---|---|
| `includes()` | `boolean` | Modern, readable — prefer this |
| `indexOf()` | index or `-1` | Universal legacy fallback |
| `search()` | index or `-1` | Useful with regex flags (e.g. `/i`) |
| `match()` | array or `null` | Overkill for simple checks |

`indexOf()` is by far the most common thing you'll encounter in legacy code. `includes()` is the right choice for anything written today.