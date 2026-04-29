<!-- before / electron-pro / so-1789945-string-contains-substring / run 2 -->

**Duration**: 23.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the rundown:

### Modern (ES6+): `String.prototype.includes()`

```js
const str = "Hello, world!";

str.includes("world");       // true
str.includes("World");       // false  (case-sensitive)
str.includes("world", 8);    // false  (optional start index)
```

This is the idiomatic choice — readable and returns a boolean directly.

---

### Legacy approaches you'll still see

**`indexOf()` — the classic pre-ES6 workaround**

```js
str.indexOf("world") !== -1;  // true
```

You may also see the terse (but cryptic) bitwise `~` trick, which exploits `~(-1) === 0`:

```js
~str.indexOf("world");  // -2 → truthy
~str.indexOf("World");  //  0 → falsy
```

**`RegExp.test()` / `search()` — when you need pattern matching**

```js
/world/.test(str);           // true
/world/i.test(str);          // true  (case-insensitive flag)
str.search(/world/) !== -1;  // true
```

---

**Rule of thumb:** use `includes()` for plain substring checks. Reach for `test()` or `search()` only when you need regex features like case-insensitivity, since `includes()` does not accept regex arguments.