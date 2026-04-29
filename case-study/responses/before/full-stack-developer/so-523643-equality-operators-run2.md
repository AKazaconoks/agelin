<!-- before / full-stack-developer / so-523643-equality-operators / run 2 -->

**Duration**: 67.1s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 67.11s > 60s

---
Here is a comprehensive breakdown:

---

## `==` vs `===` in JavaScript

### Abstract (Loose) Equality: `==`

`==` performs **type coercion** before comparing — JavaScript converts operands to a common type first. The rules are non-trivial and full of surprises:

```javascript
0 == '0'          // true  (string coerced to number)
null == undefined  // true  (special rule)
0 == false         // true  (false → 0)
2 == true          // false (true → 1, not 2)  ← surprising
'' == false        // true  (both → 0)
[] == false        // true  ([] → '' → 0, false → 0)  ← very surprising
NaN == NaN         // false (NaN is never equal to anything)
```

### Strict Equality: `===`

`===` compares **both value AND type — no coercion**. If types differ, the result is immediately `false`.

```javascript
0 === '0'          // false — different types
1 === true         // false — different types
null === undefined // false — different types
42 === 42          // true
NaN === NaN        // false (this is the one edge case even === gets "wrong")
```

---

### `!=` and `!==`

These are the exact negation counterparts — `!=` uses the same coercion as `==`, `!==` uses the same strict logic as `===`. Wherever you prefer `===`, prefer `!==`.

---

### Other Related Operators and Utilities

| Tool | Purpose |
|------|---------|
| `Object.is(a, b)` | Like `===` but correctly handles `NaN === NaN` → `true` and `+0 === -0` → `false` |
| `<`, `>`, `<=`, `>=` | Also perform coercion (no strict variant exists) |
| `Number.isNaN(x)` | The correct way to check for `NaN` |
| `Array.isArray(x)` | Because `typeof [] === 'object'` (a famous JS quirk) |

---

### Recommendation: Always use `===` and `!==`

ESLint's `eqeqeq` rule enforces this for good reason — **`==` coercion rules are too complex to reliably memorize**, and type mismatches that `===` rejects loudly often indicate real bugs.

**The one acceptable `==` exception** — checking for both `null` and `undefined` at once:

```javascript
if (value == null) { ... }  // catches null AND undefined
// equivalent to: value === null || value === undefined
```

### Quick Decision Table

| Scenario | Use |
|----------|-----|
| General equality | `===` |
| General inequality | `!==` |
| Check for `null` or `undefined` | `== null` |
| Check for `NaN` | `Number.isNaN(value)` |
| Distinguish `+0` from `-0` | `Object.is(a, b)` |
| Deep equality (objects/arrays) | `_.isEqual()` or similar library |

**Core mental model:** `===` makes your type assumptions explicit and visible in the code. `==` hides them behind coercion rules that even experienced developers get wrong.