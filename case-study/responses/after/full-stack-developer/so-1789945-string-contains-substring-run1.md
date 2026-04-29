<!-- after / full-stack-developer / so-1789945-string-contains-substring / run 1 -->

**Duration**: 26.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Checking if a String Contains a Substring in JavaScript

### Modern (ES6+) — preferred

```js
'hello world'.includes('world'); // true
'hello world'.includes('xyz');   // false
```

`String.prototype.includes()` is the idiomatic choice. It accepts an optional second argument for the starting index.

---

### Legacy approaches you'll see in older code

**`indexOf`** — returns the index of the match, or `-1` if not found:

```js
'hello world'.indexOf('world') !== -1; // true
'hello world'.indexOf('xyz') !== -1;   // false
```

The standard pre-ES6 idiom. Still perfectly valid, just more verbose.

**`search`** — takes a regex, returns index or `-1`:

```js
'hello world'.search(/world/) !== -1; // true
```

**`RegExp.test`**:

```js
/world/.test('hello world'); // true
```

---

### Summary

| Method | Returns | Use when |
|---|---|---|
| `includes()` | `boolean` | Default choice in modern code |
| `indexOf() !== -1` | `boolean` | Pre-ES6, or you also need the match position |
| `search() !== -1` | `boolean` | Already working with a regex |
| `regex.test()` | `boolean` | Already have a regex, want a clean boolean |

Use `includes()` by default. The only reason to reach for `indexOf` today is IE 11 compatibility (which lacks `includes`) or when you need the actual position of the match.