<!-- after / electron-pro / so-1789945-string-contains-substring / run 1 -->

**Duration**: 26.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the rundown:

### Modern (ES6+) — use this

```js
const str = "Hello, world!";

str.includes("world");       // true
str.includes("world", 8);    // false (optional start index)
str.includes("World");       // false (case-sensitive)
```

`String.prototype.includes` is the direct answer — reads clearly, returns a boolean, supported in all modern environments.

---

### Legacy — `indexOf`

```js
str.indexOf("world") !== -1;   // true
str.indexOf("missing") !== -1; // false

// Older "clever" shorthand with bitwise NOT — avoid, it's unreadable:
~str.indexOf("world");         // truthy
~str.indexOf("missing");       // 0 (falsy)
```

Reach for `indexOf` when you also need the position, or when supporting IE.

---

### Regex — `RegExp.prototype.test`

```js
/world/.test(str);    // true
/World/i.test(str);   // true — case-insensitive flag
```

Use regex when you need case-insensitivity or pattern matching, since `includes` has no flags and doesn't accept regex.

---

**Summary:** default to `includes`, fall back to `indexOf` when you need the index, use regex only when you need pattern-based matching or flags.