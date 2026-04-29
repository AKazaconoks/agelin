<!-- before / electron-pro / so-523643-equality-operators / run 3 -->

**Duration**: 68.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 68.52s > 60s

---
Here is a thorough breakdown of JavaScript's equality and comparison operators:

---

## `==` vs `===` (and `!=` vs `!==`)

### Strict Equality (`===`) — no type coercion

Returns `true` only if both the **value** and the **type** match. No conversions, no surprises.

```javascript
1 === 1         // true
1 === "1"       // false  (number vs string)
0 === false     // false  (number vs boolean)
null === undefined // false
```

### Abstract Equality (`==`) — type coercion applies

JavaScript converts one or both values to a common type before comparing. The rules are complex and often counterintuitive:

```javascript
1 == "1"        // true   — "1" coerces to number 1
0 == false      // true   — false coerces to 0
0 == ""         // true   — "" coerces to 0
null == undefined // true — special rule
"" == false     // true   — both coerce to 0

// The classic contradiction:
0 == ""         // true
0 == "0"        // true
"" == "0"       // false  ← if 0 equals both, why don't they equal each other?
```

Each pair goes through a different coercion path — that's the danger.

### `!=` and `!==` are just the negations

- `a !== b` is `!(a === b)` — strict, no coercion
- `a != b` is `!(a == b)` — abstract, coercion applies

---

## Other comparison operators

The relational operators (`>`, `<`, `>=`, `<=`) always coerce but follow simpler rules (numeric conversion, or lexicographic for string vs string). There is no strict version of them.

```javascript
"10" > 9        // true  — "10" coerces to 10
"10" > "9"      // false — lexicographic: "1" < "9"  ← common trap
NaN > 1         // false — NaN comparisons are always false
NaN === NaN     // false — NaN is never equal to anything, including itself
```

There is also `Object.is()` (ES6), which behaves like `===` except it correctly handles two edge cases:

```javascript
Object.is(NaN, NaN)  // true  (=== gives false)
Object.is(+0, -0)    // false (=== gives true)
```

Rarely needed in day-to-day code, but useful in library/utility code.

---

## What to use in everyday code

**Always use `===` and `!==`.** Here's why:

- `===` does exactly what it looks like — no hidden rules to memorize.
- `==` bugs are **silent** — code runs but produces wrong results.
- Every experienced JS developer reading your code expects `===` by default.

The one widely-accepted exception is checking for both `null` and `undefined` in one shot:

```javascript
if (value == null) { ... }  // catches both null and undefined
// equivalent to:
if (value === null || value === undefined) { ... }
```

Both forms are fine — pick whichever your team prefers.

---

## Summary

| Operator | Coercion | Use? |
|---|---|---|
| `===` | No | Always |
| `!==` | No | Always |
| `==` | Yes | Avoid (except `== null`) |
| `!=` | Yes | Avoid |
| `>` `<` `>=` `<=` | Yes (numeric/lexicographic) | Yes, but watch mixed types |
| `Object.is()` | No | Edge cases only |

The single best habit to build: **default to `===`** everywhere, and you'll write more predictable, easier-to-debug JavaScript from day one.