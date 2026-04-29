<!-- after / full-stack-developer / so-1789945-string-contains-substring / run 2 -->

**Duration**: 39.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
### Modern (ES6+) — `String.prototype.includes()`

```js
'hello world'.includes('world');  // true
'hello world'.includes('xyz');    // false
```

Also accepts an optional start index: `'hello world'.includes('hello', 6)` → `false`.

---

### Legacy Approaches

**`indexOf()` — the classic pre-ES6 workaround**
```js
'hello world'.indexOf('world') !== -1;  // true
```
Returns `-1` when not found, so the `!== -1` check is the idiom. Very common in older codebases.

**`RegExp.prototype.test()` — regex-based**
```js
/world/.test('hello world');  // true
```
Seen in older code, especially when case-insensitive matching was needed (`/world/i`).

**`String.prototype.search()` — also regex**
```js
'hello world'.search(/world/) !== -1;  // true
```
Less common for plain substring checks, but appears when a regex is already in play.

---

**Bottom line:** use `includes()` in any modern codebase. Use `indexOf() !== -1` only if you need IE11 compatibility or are in a legacy environment without a transpiler.