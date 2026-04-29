<!-- after / electron-pro / so-523643-equality-operators / run 2 -->

**Duration**: 37.4s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is a full breakdown from the agent:

---

## `==` vs `===` (and `!=` vs `!==`) in JavaScript

### The core difference: type coercion

- **`==` (loose equality)** converts both sides to a common type before comparing.
- **`===` (strict equality)** compares value **and** type — no conversion.

```js
5 == "5"       // true  — string coerced to number
5 === "5"      // false — number vs string

0 == false     // true  — false coerces to 0
0 === false    // false — number vs boolean

null == undefined   // true  — special rule in the spec
null === undefined  // false — different types

[] == false    // true  — a deeply non-obvious coercion chain
[] === false   // false
```

### `!=` and `!==`

These are just the negations — same coercion rules apply:

```js
5 != "5"    // false — loosely equal, so not-unequal is false
5 !== "5"   // true  — different types
```

### Are there other loose/strict pairs?

Not exactly, but two things worth knowing:

- **Relational operators** (`<`, `>`, `<=`, `>=`) always coerce — there is no strict version of them.
- **`Object.is(a, b)`** is *stricter* than `===` in two edge cases:
  ```js
  Object.is(NaN, NaN)  // true  (NaN === NaN is false)
  Object.is(+0, -0)    // false (+0 === -0 is true)
  ```
  Rarely needed in everyday code.

---

### What to use: prefer `===` and `!==`

**Default to `===` / `!==` almost everywhere.** Here is why:

- **Predictable.** `===` does exactly what it looks like.
- **`==` has well-known traps.** `"" == 0` (true), `[] == false` (true), `null == 0` (false!) — these are not intuitive and catch even experienced developers.
- **Communicates intent.** `===` signals you expect the same type, which is almost always correct.
- **Linters enforce it.** ESLint's `eqeqeq` rule flags `==` / `!=` by default in most configs.

The **one accepted exception** is the `null` check pattern:

```js
if (value == null) { ... }  // catches both null AND undefined
// equivalent to:
if (value === null || value === undefined) { ... }
```

Some teams use this intentionally. Outside of that, treat `==` and `!=` as off-limits.

---

### Quick reference

| Expression | `==` | `===` |
|---|---|---|
| `1 == "1"` | `true` | `false` |
| `0 == false` | `true` | `false` |
| `"" == false` | `true` | `false` |
| `null == undefined` | `true` | `false` |
| `null == 0` | `false` | `false` |
| `NaN == NaN` | `false` | `false` |
| `1 == 1` | `true` | `true` |

**Rule of thumb:** use `===` and `!==` by default. The coercion rules behind `==` are a source of bugs, not a feature.