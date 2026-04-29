<!-- before / bash-expert / so-523643-equality-operators / run 2 -->

**Duration**: 52.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is a thorough breakdown of JavaScript's equality operators:

---

## `==` vs `===` (Abstract vs Strict Equality)

### `===` — Strict Equality (no type coercion)
Both value **and** type must match exactly. Predictable and safe.

### `==` — Abstract Equality (with type coercion)
JavaScript tries to convert the operands to the same type before comparing, following a complex set of rules:
- Strings and numbers: string is converted to a number
- Booleans: converted to numbers (`true → 1`, `false → 0`)
- Objects: converted to primitives via `valueOf()` or `toString()`
- `null` and `undefined` are equal to each other only

---

## `!=` vs `!==` — The Inequality Counterparts

Same distinction applies — `!==` is strict (no coercion), `!=` uses coercion.

```js
5 !== "5"        // true  — different types
5 != "5"         // false — coerced to same value

null !== undefined  // true
null != undefined   // false — special rule treats them as equal
```

---

## Other Related Operators

| Operator | Name |
|---|---|
| `===` | Strict equality |
| `!==` | Strict inequality |
| `==` | Abstract equality |
| `!=` | Abstract inequality |
| `<`, `>`, `<=`, `>=` | Relational (always coerce, no strict version) |
| `Object.is()` | Like `===` but handles edge cases |

`Object.is()` is notable for two edge cases where `===` surprises:
```js
NaN === NaN          // false (!)
Object.is(NaN, NaN)  // true

+0 === -0            // true (!)
Object.is(+0, -0)    // false
```

---

## Surprising `==` Coercion Examples

```js
"" == 0        // true  — string → number
true == 1      // true  — boolean → number
false == ""    // true  — both coerce to 0
[] == false    // true  — [] → "" → 0, false → 0
[] == 0        // true
null == 0      // false — null only equals undefined
"0" == false   // true  — both become 0
"false" == false  // false — "false" becomes NaN
```

A real-world trap:
```js
// BAD — matches 0, false, [], not just empty string
if (input == "") { ... }

// GOOD — only matches empty string
if (input === "") { ... }
```

---

## Recommendation: Always Use `===` and `!==`

**Prefer strict equality in all everyday code.** Reasons:
1. **Predictable** — no hidden type conversions
2. **Bug-resistant** — avoids the coercion gotchas above
3. **Clearer intent** — you mean "same type AND value"
4. **Industry standard** — enforced by ESLint, Airbnb style guide, etc.

**The one accepted exception:** `value == null` is a common idiom to check for both `null` and `undefined` in one expression:
```js
if (value == null) { ... }  // true for null OR undefined
// equivalent to:
if (value === null || value === undefined) { ... }
```

Outside of that idiom, stick to `===` and `!==`.