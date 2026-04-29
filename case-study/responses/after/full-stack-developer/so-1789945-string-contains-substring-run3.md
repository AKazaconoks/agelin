<!-- after / full-stack-developer / so-1789945-string-contains-substring / run 3 -->

**Duration**: 19.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
JavaScript actually does have what you need — it's just called `includes()` rather than `contains()`.

---

### Modern (ES6+) — use this

```js
'hello world'.includes('world');  // true
'hello world'.includes('xyz');    // false
```

Optional second argument sets the starting index:

```js
'hello world'.includes('hello', 5);  // false — search starts at index 5
```

---

### Legacy approaches you'll still encounter

**`indexOf()`** — the pre-ES6 standard. Returns `-1` if not found:

```js
'hello world'.indexOf('world') !== -1;  // true
'hello world'.indexOf('xyz') !== -1;    // false
```

**`RegExp.test()`** — common when you need a pattern or case-insensitive match:

```js
/world/i.test('Hello World');  // true
```

---

### Quick guide

| Situation | Use |
|---|---|
| Plain substring check | `includes()` |
| Need the match position | `indexOf()` |
| Pattern / case-insensitive | `RegExp.test()` |

`includes()` is the direct replacement for the `!== -1` idiom from `indexOf()` — it reads clearly and should be your default in any modern code.