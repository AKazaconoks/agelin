<!-- after / full-stack-developer / so-523643-equality-operators / run 1 -->

**Duration**: 61.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 61.46s > 60s

---
Here is a thorough breakdown of JavaScript equality operators:

---

## `==` vs `===` (and their counterparts)

### Loose Equality `==` — Type Coercion

`==` converts operands to a common type before comparing. The rules are notoriously surprising:

```js
0   == "0"          // true  — "0" coerced to 0
0   == ""           // true  — "" coerced to 0
true == 1           // true  — true coerced to 1
null == undefined   // true  — special rule
[] == false         // true  — deep coercion chain

// The infamous "wat" case:
[] == ![]           // true  — an array equals its own negation!
```

### Strict Equality `===` — No Coercion

`===` **never converts types**. Different types → immediately `false`.

```js
0   === "0"         // false — number vs string
true === 1          // false — boolean vs number
null === undefined  // false — different types

// Objects compared by reference:
const a = { x: 1 };
const b = { x: 1 };
a === b             // false — different objects in memory
a === a             // true  — same reference

NaN === NaN         // false — IEEE 754 rule; use Number.isNaN() instead
```

### `!=` and `!==`

Simply the negations of `==` and `===` — all the same rules apply, result is flipped.

---

## Other Related Operators

| Operator | Coerces? | Notes |
|---|---|---|
| `<` `>` `<=` `>=` | Yes | No strict version exists; watch out for string vs number comparison |
| `Object.is(a, b)` | No | Like `===` but `Object.is(NaN, NaN)` → `true`; `Object.is(0, -0)` → `false` |
| `Number.isNaN(v)` | No | The correct way to detect `NaN`; prefer over global `isNaN()` |

---

## Recommendation: Always use `===` and `!==`

**Default to strict equality everywhere.** Reasons:

1. **Predictable** — no hidden conversions; any reader knows exactly what it checks.
2. **Bugs surface** — a type mismatch gives you `false` instead of silently coercing and hiding the problem.
3. **Security** — `role == 1` accepts `"1"`, `true`, and `[1]`; `role === 1` accepts only the number `1`.

**The one accepted exception** — the `null` check:

```js
if (value == null) { … }   // catches both null AND undefined in one shot
```

This is the only coercion that is intentional and universally understood. Everything else should use `===`/`!==`.

---

**Rule of thumb:** Write `===` and `!==` everywhere. If you reach for `==`, ask whether you should fix the type mismatch upstream instead.