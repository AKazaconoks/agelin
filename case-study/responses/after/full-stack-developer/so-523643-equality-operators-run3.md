<!-- after / full-stack-developer / so-523643-equality-operators / run 3 -->

**Duration**: 144.1s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 144.05s > 60s

---
Here's a thorough breakdown of JavaScript's equality operators:

---

## `==` vs `===` (and `!=` vs `!==`)

### `===` — Strict Equality (no coercion)

Compares **both value and type**. If the types differ, the result is immediately `false`.

```js
"5" === 5           // false — different types
null === undefined  // false — different types
5 === 5             // true
"hello" === "hello" // true

NaN === NaN         // false — the one gotcha; use Number.isNaN() instead
-0 === +0           // true  — treated as equal
```

### `==` — Loose Equality (with type coercion)

Converts both sides to a common type before comparing. The coercion rules are non-obvious and produce surprising results:

```js
"5" == 5            // true  — "5" is coerced to 5
"" == 0             // true  — "" becomes 0
false == "0"        // true  — false→0, "0"→0
null == undefined   // true  — special-cased in the spec
null == 0           // false — null doesn't coerce here

// The canonical "this is why == is dangerous" example:
[] == ![]           // true  — [] becomes "" becomes 0; ![] is false, becomes 0
```

### `!=` and `!==`

Simply the logical negation of `==` and `===` respectively. The same coercion rules apply to `!=`.

```js
"5" !== 5           // true  (different types)
null != undefined   // false (null == undefined is true)
```

---

## Other Related Operators

### `Object.is(a, b)` — SameValue equality

Like `===` but handles two edge cases correctly:

```js
NaN === NaN           // false
Object.is(NaN, NaN)   // true  ✓

-0 === +0             // true
Object.is(-0, +0)     // false ✓
```

Useful in algorithmic code (e.g., React uses this internally for `useMemo`/`useEffect` dependency checks). Not a general replacement for `===`.

### `Number.isNaN(x)` — Safe NaN check

The global `isNaN()` coerces its argument first (misleading); use `Number.isNaN()` instead:

```js
isNaN("hello")          // true  — coerces first, unreliable
Number.isNaN("hello")   // false — it's a string, not NaN
Number.isNaN(NaN)       // true  ✓
```

### Relational operators (`<`, `>`, `<=`, `>=`)

These also coerce types. Watch out with strings:

```js
"10" > "9"   // false — lexicographic comparison ("1" < "9")
"10" > 9     //  true — "10" is coerced to 10
```

---

## Recommendation: Always use `===` and `!==`

**Why:**

1. **Predictability** — no hidden coercion algorithm to mentally trace through.
2. **Bug prevention** — the surprising `==` behaviors (`"" == 0`, `null == undefined` but `null != 0`, `[] == ![]`) are a common source of real bugs.
3. **Linting** — ESLint's `eqeqeq` rule flags `==`/`!=` automatically. Enable it and forget about it.

**The one acceptable use of `==`** is a `null`-check idiom:

```js
if (value == null) { }  // catches both null and undefined
// equivalent to:
if (value === null || value === undefined) { }
```

This is a known pattern, but many teams ban `==` entirely and use optional chaining (`?.`) or nullish coalescing (`??`) instead for clarity.

**If you need explicit coercion, make it visible:**

```js
// Instead of relying on ==:
Number(x) === y    // intent is clear
String(x) === y    // intent is clear
```

**Bottom line:** default to `===`/`!==`, and you'll avoid an entire category of subtle JavaScript bugs.