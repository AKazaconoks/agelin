<!-- after / electron-pro / so-523643-equality-operators / run 3 -->

**Duration**: 59.3s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is a thorough explanation from the agent:

---

## Equality and Comparison Operators in JavaScript

### 1. `==` — Abstract Equality (Loose Equality)

`==` compares two values **after performing type coercion** — JavaScript will attempt to convert one or both operands to a common type before comparing.

```js
// Number vs String — string is coerced to number
"5" == 5          // true  ("5" → 5)
""  == 0          // true  ("" → 0)

// Boolean — boolean is coerced to number first
true  == 1        // true  (true → 1)
false == ""       // true  (false → 0, "" → 0)

// null and undefined — only equal to each other
null == undefined  // true  (special rule)
null == 0          // false (null is NOT coerced to 0 here)

// Objects
[] == 0            // true  ([] → "" → 0)
[1] == 1           // true  ([1] → "1" → 1)

// The classic infamous trio — NOT transitive!
0  == ""           // true
0  == "0"          // true
"" == "0"          // false  ← breaks basic transitivity
```

The last block illustrates the core danger: `==` is **not transitive**, which breaks a fundamental expectation of equality.

---

### 2. `===` — Strict Equality

`===` compares both **value and type** with no coercion. If the types differ, the result is immediately `false`.

```js
"5" === 5          // false — different types
null === undefined // false — different types
5   === 5          // true

// Objects compare by reference, not structure
const a = { x: 1 };
const b = { x: 1 };
a === b             // false — different references

// The one genuine quirk
NaN === NaN         // false — by IEEE 754 spec
```

The `NaN` case is the only notable oddity. Handle it with `Number.isNaN()`.

---

### 3. `!=` and `!==`

These are the exact logical inverses — same coercion rules apply:

```js
"5" != 5           // false  (coercion makes them equal)
"5" !== 5          // true   (different types → not strictly equal)
null != undefined  // false  (null == undefined, so != is false)
NaN !== NaN        // true
```

**Prefer `!==` over `!=`** for exactly the same reason you prefer `===` over `==`.

---

### 4. Related Operators and Utilities

**`Object.is(a, b)`** — like `===` but fixes two edge cases:
```js
Object.is(NaN, NaN)   // true  ← unlike ===
Object.is(+0, -0)     // false ← unlike ===
```

**`Number.isNaN(value)`** — the correct NaN check:
```js
isNaN("hello")         // true  — misleading (coerces first)
Number.isNaN("hello")  // false — correct: it's a string, not NaN
Number.isNaN(NaN)      // true
```

**Relational operators** (`<`, `>`, `<=`, `>=`) always coerce to numbers — there is no strict version.

**Deep equality** for objects requires a utility (`_.isEqual`, `assert.deepStrictEqual`), since neither `==` nor `===` compare object contents.

---

### 5. Recommendation

**Always use `===` and `!==` in everyday code.**

| Scenario | What to use |
|---|---|
| All normal comparisons | `===` / `!==` |
| Check for both `null` and `undefined` at once | `== null` (the one accepted exception) |
| Check for `NaN` | `Number.isNaN(value)` |
| Distinguish `+0`/`-0` or NaN-safe equality | `Object.is(a, b)` |
| Structural object comparison | `_.isEqual` / `assert.deepStrictEqual` |

**The one accepted `==` exception:**
```js
// Catches both null and undefined, and nothing else
if (value == null) { /* value is null or undefined */ }
```

This pattern appears intentionally in well-maintained codebases (Vue, React source). Every other use of `==` is almost always a bug.

**Why?** The coercion rules of `==` are non-intuitive, non-transitive, and inconsistent across types. Bugs introduced by accidental coercion are hard to spot in code review and painful to debug. `===` makes intent explicit and eliminates an entire category of subtle errors at zero cost.