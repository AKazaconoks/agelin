<!-- before / electron-pro / so-523643-equality-operators / run 2 -->

**Duration**: 50.3s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is a thorough breakdown of JavaScript's equality operators:

---

## `==` vs `===` (and `!=` vs `!==`)

### The core distinction

| Operator | Name | Coerces types? |
|---|---|---|
| `==` | Abstract equality | Yes |
| `===` | Strict equality | No |
| `!=` | Abstract inequality | Yes |
| `!==` | Strict inequality | No |

**`===` (strict)** requires both the *value* and the *type* to match. No conversion is attempted.

```js
1 === 1      // true
1 === "1"   // false — different types, done
```

**`==` (abstract)** converts one or both operands to a common type first, then compares. The conversion rules are non-trivial.

---

### Why `==` is surprising

The type coercion algorithm produces results that are hard to predict:

```js
1 == "1"       // true  (string → number)
0 == false     // true  (false → 0)
"" == false    // true  (both → 0)
[] == ![]      // true  (!) — canonical example of the weirdness
null == undefined // true  — special case in the spec
null == 0      // false — null only loosely equals undefined
```

The `[] == ![]` evaluating to `true` is not a curiosity — it's a real class of bugs.

---

### Other related operators

**`Object.is(a, b)`** (ES2015) — behaves like `===` except for two edge cases:

| Comparison | `===` | `Object.is` |
|---|---|---|
| `NaN === NaN` | `false` | `true` |
| `+0 === -0` | `true` | `false` |

```js
NaN === NaN          // false (IEEE 754 rule)
Object.is(NaN, NaN)  // true  — useful in algorithms
```

`Object.is` is a method, not an operator. It's mainly useful in low-level library code or when correctly handling `NaN`.

---

### Recommendation: always use `===` / `!==`

1. **Predictable** — no hidden algorithm to memorize.
2. **Fewer bugs** — the coercion rules for `==` are complex enough to catch experts off-guard.
3. **Explicit** — if you need cross-type comparison, do it explicitly: `Number(str) === num`.
4. **Standard practice** — ESLint's `eqeqeq` rule (enabled in virtually every standard config) flags `==`/`!=` for exactly this reason.

The one accepted exception is the `null`-check shorthand, used intentionally:

```js
// Checks for both null and undefined
if (value == null) { ... }

// Equivalent to:
if (value === null || value === undefined) { ... }
```

This is a valid use of `==`, but treat it as a deliberate choice that warrants a comment — not the default.

**Bottom line:** default to `===`/`!==`, reach for `Object.is` only when `NaN` identity matters, and treat `==`/`!=` as a tool requiring justification.