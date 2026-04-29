<!-- before / bash-expert / so-523643-equality-operators / run 3 -->

**Duration**: 57.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is a thorough breakdown of JavaScript equality operators:

---

## `==` vs `===` (and `!=` vs `!==`)

### Strict Equality (`===`) — no type coercion
Both **value and type** must match. What you see is what you get.

```javascript
5 === 5        // true
5 === "5"      // false — different types
null === undefined // false
```

### Abstract Equality (`==`) — with type coercion
JavaScript silently converts types before comparing, following complex internal rules.

```javascript
5 == "5"         // true — string coerced to number
true == 1        // true — boolean coerced to number
null == undefined // true — special case in the spec
"" == 0          // true — empty string → 0
[] == false      // true — array → "" → 0 → false
```

### Inequality mirrors the same rules
| Operator | Type coercion? |
|---|---|
| `!==` | No — strict |
| `!=` | Yes — abstract |

---

## Other related operators

**`Object.is(a, b)`** — like `===` but handles two edge cases differently:

```javascript
NaN === NaN         // false  (always false with ===)
Object.is(NaN, NaN) // true

+0 === -0           // true
Object.is(+0, -0)   // false
```

Relational operators (`<`, `>`, `<=`, `>=`) also coerce types, so `"10" > "9"` is `false` (string comparison), but `"10" > 9` is `true` (string coerced to number).

---

## What to use in everyday code

**Always prefer `===` and `!==`.** Here's why:

- **Predictable** — no hidden conversions, no surprises
- **Faster** — no coercion overhead
- **Industry standard** — ESLint's `eqeqeq` rule enforces it
- **Safer** — `==` has caused real authentication bypass bugs (e.g., `"0" == 0` is `true`)

The only widely accepted exception is `x == null`, which checks for both `null` and `undefined` simultaneously — some codebases intentionally use this shorthand:

```javascript
if (x == null) { ... }  // matches null OR undefined
// equivalent to:
if (x === null || x === undefined) { ... }
```

Outside of that specific case, stick to `===` and `!==` for clarity and safety.