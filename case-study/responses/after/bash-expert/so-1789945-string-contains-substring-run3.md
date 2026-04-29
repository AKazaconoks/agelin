<!-- after / bash-expert / so-1789945-string-contains-substring / run 3 -->

**Duration**: 19.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Checking if a string contains a substring in JavaScript

### Modern (ES6+) — preferred

```javascript
const text = "Hello, world!";

text.includes("world");        // true
text.includes("xyz");          // false
```

For case-insensitive checks:
```javascript
text.toLowerCase().includes("WORLD".toLowerCase());  // true
```

---

### Legacy approaches (still common in older codebases)

```javascript
// indexOf — returns position or -1
text.indexOf("world") !== -1;   // true

// search — accepts a regex, returns -1 if not found
text.search("world") !== -1;    // true

// Regex test — useful when you need pattern matching anyway
/world/.test(text);             // true
```

---

**Summary:** Use `String.prototype.includes()` (ES2015+) — it reads like plain English and returns a `boolean` directly. Fall back to `indexOf() !== -1` only if you need to support very old environments or also need the match position.