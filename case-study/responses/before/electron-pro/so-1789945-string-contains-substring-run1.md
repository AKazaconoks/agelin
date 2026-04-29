<!-- before / electron-pro / so-1789945-string-contains-substring / run 1 -->

**Duration**: 16.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Checking if a String Contains a Substring in JavaScript

**Modern (ES6+) — use `String.prototype.includes()`:**

```js
const str = "Hello, world!";

str.includes("world");       // true
str.includes("World");       // false (case-sensitive)
str.includes("world", 8);    // false (optional start index)
```

---

**Legacy approaches you'll still see:**

**`indexOf` (most common pre-ES6):**
```js
str.indexOf("world") !== -1;   // true
str.indexOf("world") >= 0;     // equivalent alternative
```

**`search` with a regex:**
```js
str.search(/world/) !== -1;    // true — useful when you need case-insensitivity
str.search(/World/i) !== -1;   // true (case-insensitive flag)
```

**`RegExp.test` (also common in legacy code):**
```js
/world/.test(str);    // true
/World/i.test(str);   // true (case-insensitive)
```

---

**Summary:**

| Method | Notes |
|---|---|
| `includes()` | Modern, readable, preferred |
| `indexOf() !== -1` | Works everywhere, still widely used |
| `RegExp.test()` / `search()` | Use when you need regex features (e.g., case-insensitivity) |

`includes()` is the clear modern choice. `indexOf` is the one to recognize in legacy code — you'll see it constantly in older codebases.