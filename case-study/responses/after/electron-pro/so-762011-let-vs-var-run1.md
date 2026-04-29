<!-- after / electron-pro / so-762011-let-vs-var / run 1 -->

**Duration**: 55.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete breakdown:

---

## `let` vs `var`: Key Differences

### 1. Scoping Rules

`var` is **function-scoped** (or globally scoped if declared outside a function). `let` is **block-scoped** — its lifetime is bounded by the nearest `{}`.

```js
function example() {
  if (true) {
    var x = 1;  // scoped to example()
    let y = 2;  // scoped to this if-block only
  }
  console.log(x); // 1  — still accessible
  console.log(y); // ReferenceError: y is not defined
}
```

This matters most in loops:

```js
for (var i = 0; i < 3; i++) {}
console.log(i); // 3 — leaks out of the loop

for (let j = 0; j < 3; j++) {}
console.log(j); // ReferenceError — correctly contained
```

---

### 2. Hoisting Behaviour

Both are hoisted, but behave differently in that hoisted state.

`var` is hoisted **and initialised to `undefined`**, so reading it before the declaration silently gives you `undefined`:

```js
console.log(a); // undefined  (no error)
var a = 5;
```

`let` is hoisted but **not initialised**. The period between the start of the block and the declaration line is the **Temporal Dead Zone (TDZ)**. Accessing it there throws a `ReferenceError`:

```js
console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 5;
```

The TDZ is intentional — it forces declare-before-use, surfacing bugs instead of silently swallowing them.

---

### 3. Global Scope Pollution

At the top level of a script, `var` attaches to the global object (`window`). `let` does not.

```js
var foo = 'hello';
let bar = 'world';

console.log(window.foo); // 'hello'
console.log(window.bar); // undefined
```

---

### 4. Re-declaration

`var` allows re-declaring the same name in the same scope. `let` throws a `SyntaxError`, catching typos early:

```js
var x = 1;
var x = 2; // fine, silently overwrites

let y = 1;
let y = 2; // SyntaxError: Identifier 'y' has already been declared
```

---

### 5. Closure Behaviour in Loops (Classic Gotcha)

Each `let` iteration gets its own binding. With `var` there is only one shared binding:

```js
// var — all callbacks share the same `i`
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // prints: 3, 3, 3
}

// let — each iteration has its own `i`
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // prints: 0, 1, 2
}
```

Pre-ES6 this required an IIFE workaround. `let` makes that unnecessary.

---

### When to Use Each

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | Block | Block |
| TDZ | No | Yes | Yes |
| Global pollution | Yes | No | No |
| Re-declare | Yes | No | No |
| Re-assign | Yes | Yes | No |

**The practical rule for new code:**
- **`const`** by default — for anything that won't be reassigned (most declarations).
- **`let`** when you need to reassign (loop counters, accumulators).
- **`var`** never — only relevant when maintaining legacy pre-ES6 code.

`let` and `const` behave the way most developers *expect* a variable to behave: it exists in the block where it is declared, it does not exist before that line, and it does not pollute the global object.