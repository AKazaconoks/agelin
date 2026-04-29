<!-- before / electron-pro / so-762011-let-vs-var / run 1 -->

**Duration**: 57.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough breakdown of `let` vs `var`:

---

## 1. Scoping Rules

`var` is **function-scoped** — visible anywhere inside the enclosing function, regardless of `if`/`for`/`while` blocks. `let` is **block-scoped** — confined to the nearest `{}`.

```js
function scopeDemo() {
  if (true) {
    var x = "var";   // hoisted to function scope
    let y = "let";   // confined to this if-block
  }
  console.log(x);    // "var"
  console.log(y);    // ReferenceError: y is not defined
}
```

This is especially dangerous in loops where async callbacks are involved:

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);  // prints 3, 3, 3  ← shared binding
}

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);  // prints 0, 1, 2  ← per-iteration binding
}
```

---

## 2. Hoisting and the Temporal Dead Zone (TDZ)

Both are hoisted, but differently:

- **`var`** is hoisted *and initialised* to `undefined` immediately — reads before the declaration line return `undefined` silently.
- **`let`** is hoisted but *not initialised*. The gap between the block start and the declaration line is the **Temporal Dead Zone**. Any access inside it throws a `ReferenceError`.

```js
console.log(a);  // undefined  ← var, silent non-error
var a = 1;

console.log(b);  // ReferenceError  ← let, loud error
let b = 2;
```

A subtle TDZ trap — inner `let` shadows outer, but is unreadable until its declaration:

```js
let x = "outer";
{
  console.log(x);  // ReferenceError (inner x is in TDZ, shadows outer x)
  let x = "inner";
}
```

The TDZ is intentional: it turns a silent `undefined` bug into an immediate, locatable error.

---

## 3. Re-declaration

`var` silently allows re-declaring the same name in the same scope. `let` throws a `SyntaxError` at parse time:

```js
var user = "Alice";
var user = "Bob";   // fine — silently overwrites

let user = "Alice";
let user = "Bob";   // SyntaxError: already declared
```

Reassignment (`user = "Bob"`) is still fine with `let` — only re-declaration is blocked.

---

## 4. Global Object Pollution

At the top level of a script, `var` creates a property on `window` (browser) or `global` (Node). `let` does not:

```js
var appConfig = {};
console.log(window.appConfig);  // {} — global pollution, cross-script collisions possible

let appConfig = {};
console.log(window.appConfig);  // undefined — safely isolated
```

---

## 5. Other Practical Points

**`switch` blocks:** All `case` clauses share one block scope. Re-declaring a `let` across cases is a `SyntaxError`; fix it by wrapping each case in its own `{}`.

**`try/catch`:** A `var` inside `try` leaks into the surrounding function. If the `try` throws, the variable is silently `undefined` in subsequent code. With `let`, it would be a `ReferenceError` — an honest failure.

---

## Quick Reference

| | `var` | `let` |
|---|---|---|
| Scope | Function / global | Block |
| Hoisting | Hoisted + `undefined` | Hoisted, TDZ until declared |
| Re-declaration | Silent | `SyntaxError` |
| Attaches to `window` | Yes (top level) | No |
| Loop closure | Shared binding | Per-iteration binding |

---

## When to use `var`

Practically never in new code. The idiomatic ES6+ pattern is:
- `const` for bindings that won't be reassigned
- `let` for bindings that will be reassigned
- `var` only when targeting environments without ES6 and no transpiler — an increasingly rare scenario

`let` and `const` enforce scope mechanically, turning whole categories of subtle bugs into immediate, loud errors.