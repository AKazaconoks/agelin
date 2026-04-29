<!-- before / electron-pro / so-523643-equality-operators / run 1 -->

**Duration**: 42.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is the full explanation from the agent:

---

## `==` vs `===` (Loose vs Strict Equality)

The core difference is **type coercion**: `==` converts operands to a matching type before comparing, while `===` compares both value **and** type with no conversion.

```js
// Loose equality (==) — coerces types first
0 == "0"           // true  (string "0" coerced to number 0)
0 == false         // true  (false coerced to number 0)
null == undefined  // true  (special rule in the spec)

// Strict equality (===) — no coercion
0 === "0"          // false (number vs string)
0 === false        // false (number vs boolean)
null === undefined // false (different types)
```

---

## `!=` vs `!==` (Loose vs Strict Inequality)

These are the negations of `==` and `===`, with the same coercion behaviour.

```js
0 != "0"           // false (they ARE loosely equal)
null != undefined  // false (they ARE loosely equal)

0 !== "0"          // true  (different types)
null !== undefined // true  (different types)
```

---

## Are There Other "Loose vs Strict" Pairs?

Not with explicit operator pairs, but two related things to know:

- **Relational operators** (`<`, `>`, `<=`, `>=`) **always coerce** — there is no strict version of them.
- **`Object.is()`** is stricter than `===` for two edge cases:

```js
NaN === NaN         // false (IEEE 754 quirk)
Object.is(NaN, NaN) // true

-0 === +0           // true
Object.is(-0, +0)   // false
```

---

## Which Should You Use?

**Always prefer `===` and `!==`.**

- **Predictability** — the result is obvious from the two values; no hidden coercion rules.
- **Bug prevention** — coercion failures are silent and produce wrong booleans, not errors.
- **Linters enforce it** — ESLint's `eqeqeq` rule flags `==`/`!=` for exactly this reason.

**The one accepted exception** is checking for both `null` and `undefined` at once:

```js
// These are equivalent — the == null form is idiomatic and widely accepted:
if (value === null || value === undefined) { ... }
if (value == null) { ... }
```

Outside of that specific pattern, there is no good reason to reach for `==` or `!=`.

---

### Summary

| Operator | Name | Coerces types? | Recommended? |
|---|---|---|---|
| `==` | Loose equality | Yes | No (except `== null`) |
| `===` | Strict equality | No | **Yes** |
| `!=` | Loose inequality | Yes | No (except `!= null`) |
| `!==` | Strict inequality | No | **Yes** |