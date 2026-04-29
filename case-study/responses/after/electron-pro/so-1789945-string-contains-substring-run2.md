<!-- after / electron-pro / so-1789945-string-contains-substring / run 2 -->

**Duration**: 18.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
### Modern (ES6+) — preferred

```js
"hello world".includes("world"); // true
"hello world".includes("xyz");   // false

// Case-insensitive:
"Hello World".toLowerCase().includes("world"); // true
```

---

### Legacy approaches

**`indexOf`** — returns index or `-1`:

```js
"hello world".indexOf("world") !== -1; // true
```

**`search`** — accepts a regex:

```js
"hello world".search(/world/) !== -1; // true
```

**`RegExp.test`** — returns boolean, useful with patterns:

```js
/world/.test("hello world");  // true
/world/i.test("Hello World"); // true  (case-insensitive)
```

---

**Quick guide:**

| Situation | Use |
|---|---|
| Plain substring | `includes()` |
| Need the position | `indexOf()` |
| Pattern/regex match | `RegExp.test()` |

`String.prototype.includes()` was added in ES2015 (ES6). `indexOf` is the classic pre-ES6 fallback you'll still see in older codebases and transpiled output.