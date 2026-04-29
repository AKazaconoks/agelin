<!-- before / full-stack-developer / so-762011-let-vs-var / run 2 -->

**Duration**: 47.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough breakdown of `let` vs `var`:

---

## `let` vs `var` in JavaScript

---

### 1. Scope

**`var` is function-scoped** (or globally scoped if declared outside a function). It ignores block boundaries like `if`, `for`, and `{}`.

**`let` is block-scoped** — confined to the nearest enclosing `{...}` block.

```js
function example() {
  if (true) {
    var x = 'var';   // scoped to example()
    let y = 'let';   // scoped to this if-block
  }
  console.log(x); // 'var'  — visible here
  console.log(y); // ReferenceError — not visible here
}
```

`var` declarations "leak" out of blocks, which is a frequent source of bugs.

---

### 2. Hoisting and the Temporal Dead Zone (TDZ)

Both are **hoisted**, but initialized differently.

**`var`** is hoisted and immediately initialized to `undefined`:

```js
console.log(a); // undefined — no error
var a = 5;
```

**`let`** is hoisted but **not initialized**. It sits in a **Temporal Dead Zone (TDZ)** until its declaration line is reached — any access before that throws a `ReferenceError`:

```js
console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 5;
```

The TDZ converts what would be a silent `undefined` bug with `var` into a loud, immediate error — much easier to diagnose.

---

### 3. Re-declaration

**`var`** allows silent re-declaration in the same scope:

```js
var name = 'Alice';
var name = 'Bob'; // no error — overwrites silently
```

**`let`** throws a `SyntaxError`:

```js
let name = 'Alice';
let name = 'Bob'; // SyntaxError: Identifier 'name' has already been declared
```

---

### 4. Global Object Property Creation

At the top level of a script, `var` attaches to the global object (`window` / `global`). `let` does not.

```js
var foo = 'bar';
let baz = 'qux';

console.log(window.foo); // 'bar'
console.log(window.baz); // undefined
```

`var` pollutes the global namespace; `let` doesn't.

---

### 5. Loop Variable Capture (the classic footgun)

With `var`, all loop iterations share **one binding**:

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 3, 3, 3
```

With `let`, each iteration gets its **own fresh binding**:

```js
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 0, 1, 2
```

Before `let`, the workaround was an IIFE per iteration. `let` makes that unnecessary.

---

### 6. Practical Guidance

The modern consensus: **don't use `var` in new code.**

| Situation | Recommendation |
|---|---|
| Variable that will be reassigned | `let` |
| Variable that won't be reassigned | `const` (preferred) |
| Loop counters | `let` |
| Legacy `var` code | Migrate to `let`/`const` as you touch it |

**Rule of thumb:** default to `const`, use `let` when you need reassignment, and treat `var` as a legacy construct you recognize but don't write.

---

### Quick Reference

| Feature | `var` | `let` |
|---|---|---|
| Scope | Function / global | Block |
| Hoisting | Initialized to `undefined` | TDZ — `ReferenceError` if accessed early |
| Re-declaration | Allowed | `SyntaxError` |
| Adds to global object | Yes (at top level) | No |
| Per-iteration binding in loops | No | Yes |
| Recommended in new code | No | Yes (or `const`) |