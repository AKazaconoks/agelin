<!-- after / electron-pro / so-523643-equality-operators / run 1 -->

**Duration**: 47.9s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is a thorough breakdown from the agent:

---

## `==` vs `===` (and `!=` vs `!==`) in JavaScript

### The core difference: type coercion

`==` (loose equality) coerces operands to the same type before comparing. `===` (strict equality) requires both **value and type** to match — no conversion.

```js
// == performs type coercion
0 == false        // true  — false coerces to 0
"" == false       // true  — both coerce to 0
null == undefined // true  — special-cased in the spec
null == 0         // false — null only loosely equals undefined

// === requires identical type AND value
0 === false       // false
1 === "1"         // false
null === undefined// false
```

The coercion rules are genuinely surprising at the edges:

```js
[] == false   // true   ([] → "" → 0, false → 0)
[] == ![]     // true   (![] is false, then [] == false)
" \t\r\n" == 0 // true  (whitespace strings coerce to 0)
```

---

### `!=` and `!==`

These are exactly the negations of their equality counterparts — the same coercion rules apply.

```js
1 != "1"    // false — coercion makes them equal
1 !== "1"   // true  — different types
```

---

### Other related operators

**`Object.is(a, b)`** — like `===`, but handles two edge cases differently:

```js
NaN === NaN          // false (IEEE 754)
Object.is(NaN, NaN)  // true

+0 === -0            // true
Object.is(+0, -0)    // false
```

This is the equality algorithm used by `Array.prototype.includes`, `Map`, and `Set`.

```js
[NaN].includes(NaN)  // true  — Object.is semantics
[NaN].indexOf(NaN)   // -1    — === semantics
```

**Relational operators** (`<`, `>`, `<=`, `>=`) also coerce, with their own inconsistencies:

```js
null >= 0   // true  — null coerces to 0 here
null == 0   // false — but NOT loosely equal to 0 (spec inconsistency!)
```

---

### Quick reference

| Operator | Type coercion | Use it? |
|---|---|---|
| `==` | Yes | Avoid (except possibly `== null`) |
| `===` | No | **Yes — default choice** |
| `!=` | Yes | Avoid |
| `!==` | No | **Yes — default choice** |
| `Object.is()` | No | Yes, when `NaN` or signed-zero identity matters |

---

### Recommendation

**Always use `===` and `!==`.** The coercion rules for `==` are a hidden lookup table; `===` is predictable, readable, and easier for engines to optimize.

The one widely-accepted exception is `== null`, which concisely catches both `null` and `undefined`:

```js
if (x == null) { ... }  // catches null AND undefined — some style guides permit this
```

Modern alternatives with `??` and `?.` often make even this unnecessary.

**Enforce it automatically with ESLint:**

```json
{ "rules": { "eqeqeq": ["error", "always"] } }
```

The practical rule: **write `===`, let ESLint enforce it, and you never need to memorize the coercion table.**