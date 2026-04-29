<!-- before / bash-expert / so-1789945-string-contains-substring / run 2 -->

**Duration**: 23.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Checking for substring in JavaScript

JavaScript doesn't have `String.contains()`, but here's what to use:

### Modern (ES6+) — use `includes()`

```javascript
const text = "Hello, world!";

text.includes("world");    // true
text.includes("universe"); // false
```

Readable, purpose-built, and the right choice for all new code.

---

### Legacy approaches (still common in older codebases)

**`indexOf()` — most common legacy pattern:**
```javascript
text.indexOf("world") !== -1;   // true
text.indexOf("universe") !== -1; // false
```

**`search()` — regex-based, returns index or -1:**
```javascript
text.search("world") !== -1; // true
```

**`match()` — returns match array or `null`:**
```javascript
text.match("world") !== null; // true
```

**`RegExp.test()` — common when regex patterns are involved:**
```javascript
/world/.test(text); // true
```

---

**Rule of thumb:** use `includes()` unless you need IE11 support (use `indexOf` then) or pattern matching (use regex then).