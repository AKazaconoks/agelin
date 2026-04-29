<!-- before / full-stack-developer / so-523643-equality-operators / run 1 -->

**Duration**: 71.1s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 71.10s > 60s

---
Here is a thorough breakdown:

---

## `==` vs `===` (and `!=` vs `!==`)

### The core difference

- **`===` (strict equality)** — compares type AND value. No coercion ever happens.
- **`==` (loose/abstract equality)** — converts operands to a common type first, then compares. The conversion rules are complex and non-obvious.

```javascript
1 === "1"   // false — different types
1 == "1"    // true  — "1" is coerced to 1 first

true === 1  // false — different types
true == 1   // true  — true coerced to 1

null === undefined  // false — different types
null == undefined   // true  — special rule in the spec
```

### How `==` coercion works (simplified)

1. If types match → compare like `===`
2. `null == undefined` → always `true` (and only this pair)
3. string vs number → convert string to number
4. boolean vs anything → convert boolean to number (`true→1`, `false→0`), retry
5. object vs primitive → call `valueOf()`/`toString()` on the object, retry

This leads to famously surprising results:

```javascript
0  == ""        // true  ("" → 0)
0  == "0"       // true  ("0" → 0)
"" == "0"       // false (both strings, no coercion)
// == is NOT transitive — it's not a real equivalence relation

false == ""     // true  (false→0, ""→0)
false == "false"// false (false→0, "false"→NaN)

[] == 0         // true  ([].valueOf() → "" → 0)
[1] == 1        // true  ([1].valueOf() → "1" → 1)
```

### `!=` and `!==`

These are simply the negations — same rules apply:

```javascript
1 !== "1"   // true  — strict, no coercion
1 != "1"    // false — coerces "1" to 1, then 1==1, negated
```

---

## Are there more such pairs?

`==`/`===` and `!=`/`!==` are the **only operator pairs** with loose vs strict variants. But coercion appears elsewhere:

- **`<`, `>`, `<=`, `>=`** — always coerce, no strict version. Be careful with mixed types.
- **`Object.is()`** — stricter than `===`, correctly handles `NaN` and `-0`:

```javascript
NaN === NaN         // false (IEEE 754 quirk)
Object.is(NaN, NaN) // true

0 === -0            // true
Object.is(0, -0)    // false
```

- **`switch`** uses `===` internally — no coercion.

---

## What to use in everyday code

**Use `===` and `!==` by default.** Every major linter (ESLint `eqeqeq` rule, Airbnb config, Standard) enforces this. Reasons:

1. One simple rule to remember: same type + same value.
2. Type mismatches caught at the comparison are usually real bugs upstream.
3. Coercion chains with `==` break transitivity, making reasoning about code harder.

**The one accepted exception** — checking for `null` or `undefined` together:

```javascript
if (value == null) { ... }  // catches both null AND undefined
// Equivalent but longer:
if (value === null || value === undefined) { ... }
```

This pattern is idiomatic and widely understood. If your ESLint config disallows it, configure `eqeqeq: ["error", "always", { null: "ignore" }]`.

---

**Quick reference:**

| Need | Use |
|---|---|
| General comparison | `===` / `!==` |
| Null-or-undefined guard | `== null` / `!= null` |
| NaN check | `Number.isNaN(x)` |
| Signed-zero or NaN identity | `Object.is(a, b)` |