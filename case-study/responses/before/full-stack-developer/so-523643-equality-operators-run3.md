<!-- before / full-stack-developer / so-523643-equality-operators / run 3 -->

**Duration**: 70.7s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 70.72s > 60s

---
Here is a complete breakdown from the agent:

---

## `==` vs `===` in JavaScript

### The Core Difference

| Operator | Name | Type Check | Coerces Types? |
|---|---|---|---|
| `==` | Abstract / Loose Equality | No | **Yes** |
| `===` | Strict Equality | Yes | **No** |

- **`===`** returns `true` only if both **value AND type** match. No conversion, no surprises.
- **`==`** first applies complex type coercion rules from the ECMAScript spec, then compares.

### Why `==` Is Dangerous

```js
1 == "1"         // true  — string coerced to number
0 == false       // true  — false coerced to 0
"" == false      // true  — both coerce to 0
null == undefined // true — special spec rule
[] == ![]        // true  — this breaks people's brains
```

The `[] == ![]` case is notorious: `![]` → `false` → `0`, and `[]` → `""` → `0`, so `0 == 0` is `true`. Technically correct, humanly baffling.

### `!=` vs `!==`

Exact negations — same rules apply, just inverted. Prefer `!==` for the same reasons you prefer `===`.

---

## More Related Operators / Nuances

**`Object.is()`** — stricter than `===`, fixes two edge cases:
```js
NaN === NaN          // false (broken)
Object.is(NaN, NaN)  // true  (correct)

0 === -0             // true  (same in ===)
Object.is(0, -0)     // false (distinct values)
```

**Relational operators** (`<`, `>`, `<=`, `>=`) — no strict variant exists; they always coerce. Watch out for the infamous `null >= 0` → `true` quirk.

---

## Recommendation: Always Use `===` and `!==`

- **Predictable:** does exactly what it looks like
- **Readable:** intent is unambiguous
- **Bug-proof:** eliminates the entire class of coercion bugs
- **Industry standard:** mandated by Airbnb, Google, StandardJS style guides; enforced by ESLint's `eqeqeq` rule

**The one accepted exception:**

```js
// Checks for both null AND undefined — a well-known, intentional pattern
if (value == null) { ... }
```

Because only `null` and `undefined` are loosely equal to `null`, this is safe and common in professional code. Add a comment to signal intent.

**Quick reference:**

| Use Case | What to Use |
|---|---|
| Everyday equality | `===` |
| Everyday inequality | `!==` |
| null/undefined check | `=== null` or `== null` (accepted shorthand) |
| NaN identity check | `Number.isNaN(value)` |
| Precise identity (`+0`/`-0`) | `Object.is()` |

> Mental model: **`==` is JavaScript guessing what you meant. `===` is JavaScript doing exactly what you said.** In production code, prefer the latter.