<!-- before / bash-expert / so-523643-equality-operators / run 1 -->

**Duration**: 44.1s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is a thorough breakdown from the agent:

---

## `==` vs `===` in JavaScript

### Strict Equality (`===`) — **Recommended**
No type coercion. Both value **and** type must match.

```javascript
5 === 5      // true
5 === "5"    // false (different types)
null === undefined  // false
```

### Abstract Equality (`==`) — **Avoid**
Performs type coercion before comparing — often surprising.

```javascript
5 == "5"       // true  (string coerced to number)
0 == false     // true  (false coerced to 0)
[] == false    // true  (array → string → number)
null == undefined  // true  (special-cased)
```

---

## Inequality: `!==` vs `!=`

The same rules apply — `!==` is strict (no coercion), `!=` is loose (with coercion). **Prefer `!==`.**

---

## Other Related Operators

| Operator | Notes |
|---|---|
| `<`, `>`, `<=`, `>=` | Always do type coercion on operands |
| `Object.is(a, b)` | Like `===` but handles `NaN === NaN` → `true` and `-0 === +0` → `false` correctly |

---

## What to Use in Everyday Code

**Always use `===` and `!==`.** Here's why:

1. **Predictable** — no hidden coercion rules to memorize
2. **Fewer bugs** — `0 == false`, `"" == false`, `[] == ""` all return `true` and are common foot-guns
3. **Better performance** — no coercion overhead
4. **Industry standard** — ESLint's `eqeqeq` rule, Airbnb/Google style guides all mandate `===`
5. **TypeScript-friendly** — aligns with static typing

The one accepted exception is `== null`, which simultaneously checks for both `null` and `undefined` — but even then, explicit checks or optional chaining (`?.`) are often clearer.