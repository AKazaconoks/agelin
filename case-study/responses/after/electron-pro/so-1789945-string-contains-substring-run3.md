<!-- after / electron-pro / so-1789945-string-contains-substring / run 3 -->

**Duration**: 19.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
**Modern (ES6+)** — `String.prototype.includes()`:

```js
const str = "hello world";

str.includes("world");       // true
str.includes("World");       // false — case-sensitive
str.includes("world", 6);    // false — optional start index
```

This is the idiomatic choice for a plain substring check.

---

**Legacy approaches** you'll still encounter:

```js
// indexOf — the classic pre-ES6 workaround
str.indexOf("world") !== -1;   // true

// RegExp.test — best option when you need flags like case-insensitivity
/world/i.test(str);            // true  (includes() has no flag support)

// match — allocates an array unnecessarily; avoid for existence checks
str.match(/world/) !== null;   // true

// search — similar to match, returns index or -1
str.search(/world/) !== -1;    // true
```

---

**Rule of thumb:**
- Plain substring → `includes()`
- Need case-insensitive or regex pattern → `/pattern/i.test(str)`
- `indexOf !== -1` is still fine and ubiquitous in older code