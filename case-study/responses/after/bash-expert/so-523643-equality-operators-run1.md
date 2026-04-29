<!-- after / bash-expert / so-523643-equality-operators / run 1 -->

**Duration**: 40.1s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here's a thorough breakdown of JavaScript's equality and comparison operators:

---

## `==` vs `===` (and `!=` vs `!==`)

### Strict Equality (`===` / `!==`)

Compares **value AND type** — no type conversion happens.

```javascript
5 === 5        // true
5 === "5"      // false — different types
null === undefined  // false
```

### Abstract Equality (`==` / `!=`)

Performs **type coercion** before comparing, following complex rules.

```javascript
5 == "5"          // true — "5" converted to 5
true == 1         // true — true converted to 1
null == undefined // true — special case
"   " == 0        // true — whitespace string becomes 0
```

The coercion rules are non-obvious, which makes this operator error-prone.

---

## Other Comparison Operators

| Operator | Notes |
|---|---|
| `>`, `<`, `>=`, `<=` | Also do type coercion. Watch out: `"10" < "2"` is `true` (lexicographic!), but `"10" < 2` is `false` (numeric). |
| `Object.is()` | Like `===` but handles two edge cases: `Object.is(NaN, NaN)` → `true`; `Object.is(-0, +0)` → `false`. |

---

## What to Prefer

**Always use `===` and `!==` by default.** Here's why:

```javascript
// == leads to surprises
console.log(0 == "");   // true
console.log(0 == "0");  // true
console.log("" == "0"); // false  ← inconsistent!

// === is predictable
console.log(0 === "");   // false
console.log(0 === "0");  // false
console.log("" === "0"); // false
```

Benefits of `===`:
- **Predictable** — no hidden coercion
- **Faster** — no type conversion needed
- **Clearer intent** — types matter in JS

---

## The One Common Exception

Some developers use `== null` as a shorthand to catch both `null` and `undefined`:

```javascript
if (value == null) { /* true for both null and undefined */ }
```

Even so, the explicit form is usually clearer:

```javascript
if (value === null || value === undefined) { ... }
```

---

**Rule of thumb:** Default to `===`/`!==`. Treat `==`/`!=` as a code smell unless you have a deliberate reason.