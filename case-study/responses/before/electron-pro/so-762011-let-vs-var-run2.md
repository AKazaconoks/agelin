<!-- before / electron-pro / so-762011-let-vs-var / run 2 -->

**Duration**: 51.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## `let` vs `var` in JavaScript

### 1. Scoping Rules

`var` is **function-scoped** — it ignores `if`, `for`, and other block boundaries, leaking into the enclosing function. `let` is **block-scoped** — confined to the nearest `{}`.

```javascript
function scopeDemo() {
  if (true) {
    var x = 'var';   // scoped to scopeDemo()
    let y = 'let';   // scoped to this if-block
  }
  console.log(x);    // 'var'
  console.log(y);    // ReferenceError
}

for (var i = 0; i < 3; i++) {}
console.log(i); // 3 — leaked out

for (let j = 0; j < 3; j++) {}
console.log(j); // ReferenceError
```

---

### 2. Hoisting and the Temporal Dead Zone (TDZ)

Both are hoisted, but differently:

- **`var`** is initialized to `undefined` immediately — accessing it before declaration silently returns `undefined`.
- **`let`** is hoisted but **not initialized**. Accessing it before the declaration line throws a `ReferenceError`. This window is the *temporal dead zone*.

```javascript
console.log(a); // undefined
var a = 10;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 10;
```

The TDZ is intentional — it surfaces use-before-declare bugs that `var` silently hides.

---

### 3. Re-declaration Rules

`var` allows re-declaration in the same scope with no error. `let` throws a `SyntaxError` at parse time (before the code even runs).

```javascript
var name = 'Alice';
var name = 'Bob';   // Fine — silently overwrites

let name = 'Alice';
let name = 'Bob';   // SyntaxError
```

Re-*assignment* is still fine with `let`; only re-*declaration* is forbidden.

---

### 4. Global Object Attachment

Top-level `var` creates a property on `window` (browsers) / `global` (Node). `let` does not.

```javascript
var globalVar = 'yes';
let globalLet = 'no';

window.globalVar; // 'yes'
window.globalLet; // undefined
```

---

### 5. Closure in Loops (The Classic Gotcha)

With `var`, all loop iterations share one binding. With `let`, each iteration gets its own.

```javascript
// var — all callbacks see the final value
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3

// let — each iteration captures its own i
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2
```

Before `let`, the workaround was an IIFE. With `let`, no workaround is needed.

---

### Quick Reference

| Behaviour | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisted initial value | `undefined` | Uninitialized (TDZ) |
| Re-declaration in same scope | Allowed | `SyntaxError` |
| Attaches to global object | Yes | No |
| Safe in loop closures | No | Yes |

**Rule of thumb:** use `let` (or `const`) by default. `var` is only needed when you explicitly require function-scoped behaviour or are maintaining legacy code.