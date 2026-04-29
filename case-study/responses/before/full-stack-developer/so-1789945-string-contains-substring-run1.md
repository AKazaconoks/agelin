<!-- before / full-stack-developer / so-1789945-string-contains-substring / run 1 -->

**Duration**: 24.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Checking if a String Contains a Substring in JavaScript

### Modern (ES6+) — Preferred

**`String.prototype.includes()`**

```javascript
const str = "Hello, world!";

str.includes("world");       // true
str.includes("xyz");         // false

// Optional start position
str.includes("Hello", 1);   // false (starts searching at index 1)
```

---

### Legacy Approaches

**1. `indexOf()` — most common pre-ES6 pattern**

```javascript
str.indexOf("world") !== -1;   // true

// Terse bitwise shorthand you'll still see in old code
~str.indexOf("world");         // truthy (-2)
~str.indexOf("xyz");           // falsy (0)
```

**2. `RegExp.test()` — useful when you need case-insensitivity**

```javascript
/world/.test(str);       // true
/World/i.test(str);      // true (case-insensitive flag)
```

**3. `search()` — regex variant, returns index or `-1`**

```javascript
str.search(/world/) !== -1;    // true
```

---

### Quick Rule of Thumb

| Situation | Use |
|---|---|
| Simple substring check | `includes()` |
| Need the match's position | `indexOf()` |
| Case-insensitive or pattern match | `/regex/i.test()` |

`includes()` is the right default for any modern code. The `indexOf() !== -1` pattern is the one you'll most commonly encounter in legacy codebases.