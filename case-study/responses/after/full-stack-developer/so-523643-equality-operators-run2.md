<!-- after / full-stack-developer / so-523643-equality-operators / run 2 -->

**Duration**: 39.1s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here's a thorough breakdown from the agent:

---

## `==` vs `===` (Loose vs Strict Equality)

The core difference is **type coercion**: `==` converts operands to the same type before comparing; `===` does not — it requires both value **and** type to match.

```js
// == performs type coercion
0 == false        // true  — false is coerced to 0
"5" == 5          // true  — string "5" coerces to number 5
null == undefined // true  — special rule
[] == false       // true  — [] → "" → 0; false → 0

// === checks value AND type — no surprises
0 === false        // false — number vs boolean
"5" === 5          // false — string vs number
null === undefined // false — different types
```

---

## `!=` vs `!==` (Loose vs Strict Inequality)

These are simply the negations of `==` and `===` — the same coercion rules apply.

```js
"5" != 5    // false — they ARE loosely equal
"5" !== 5   // true  — different types, strict check
```

---

## Other Comparison Operators

The relational operators `<`, `>`, `<=`, `>=` always work numerically (with coercion) and have no "strict" variant. There's a well-known quirk:

```js
null >= 0   // true   — null coerces to 0 in relational comparisons
null == 0   // false  — null is only loosely equal to undefined (not 0)
```

---

## Recommendation: Always use `===` and `!==`

**Use `===` and `!==` by default.** Why:

- **Predictability** — no hidden type conversions, easier to reason about.
- **Catches bugs early** — `level == 1` silently accepts `"1"` and `true`; `level === 1` doesn't.
- **Linters agree** — ESLint's `eqeqeq` rule flags `==`/`!=` by default in popular configs (Airbnb, Standard).

The one widely accepted exception is a `null`/`undefined` check:

```js
// Acceptable shorthand — checks for BOTH null AND undefined
if (value == null) { ... }
// equivalent to: value === null || value === undefined
```

### Quick reference

| Operator | Name | Coerces? | Use it? |
|---|---|---|---|
| `===` | Strict equality | No | Yes — default choice |
| `!==` | Strict inequality | No | Yes — default choice |
| `==` | Loose equality | Yes | Only for `== null` checks |
| `!=` | Loose inequality | Yes | Avoid |
| `>`, `<`, `>=`, `<=` | Relational | Yes (numeric) | Yes, but mind `null`/`undefined` quirks |