<!-- after / electron-pro / so-762011-let-vs-var / run 2 -->

**Duration**: 41.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a comprehensive breakdown of `let` vs `var`:

---

## `var` vs `let` in JavaScript

### 1. Scoping Rules

`var` is **function-scoped** — it leaks out of blocks like `if`, `for`, `while`.
`let` is **block-scoped** — it is confined to the nearest `{}`.

```js
function example() {
  if (true) {
    var x = "var";
    let y = "let";
  }
  console.log(x); // "var"  — leaked out of the if-block
  console.log(y); // ReferenceError: y is not defined
}
```

The classic `for` loop trap:

```js
// var: every callback closes over the same variable
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // prints 3, 3, 3
}

// let: each iteration gets its own binding
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // prints 0, 1, 2
}
```

---

### 2. Hoisting and the Temporal Dead Zone (TDZ)

Both are **hoisted**, but behave differently before their declaration line.

`var` is hoisted **and initialised to `undefined`** immediately.
`let` is hoisted but stays **uninitialised** — reading it before the declaration throws a `ReferenceError`. This gap is the **Temporal Dead Zone (TDZ)**.

```js
console.log(a); // undefined  — hoisted + initialised
var a = 10;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 10;
```

The TDZ turns a silent `undefined` bug into an immediate, loud error — that is a feature.

---

### 3. Re-declaration Rules

```js
var count = 1;
var count = 2; // fine — silently overwrites

let total = 1;
let total = 2; // SyntaxError: Identifier 'total' has already been declared
```

---

### 4. Global Object Property Attachment

```js
var globalVar = "I am on window";
let globalLet = "I am not";

console.log(globalThis.globalVar); // "I am on window"
console.log(globalThis.globalLet); // undefined
```

This matters when third-party scripts poke at `window`, or you accidentally shadow a built-in like `window.name`.

---

### 5. `switch` Statement Gotcha

`switch` cases share one block, so two `let` declarations of the same name across cases is a `SyntaxError`. Fix it by wrapping each case in its own braces:

```js
switch (val) {
  case 1: {
    let msg = "one";
    break;
  }
  case 2: {
    let msg = "two";  // fine — separate block
    break;
  }
}
```

---

### Quick Reference

| | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisting | Yes, initialised as `undefined` | Yes, but TDZ — uninitialised |
| Re-declaration | Allowed | SyntaxError |
| Global property | Yes (`window.x`) | No |
| `for` loop binding | Shared across iterations | Per-iteration copy |

**Default rule:** use `let` (or `const`) everywhere. Reach for `var` only when maintaining legacy code that deliberately relies on function-scoped or re-declaration behaviour.