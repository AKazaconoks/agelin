<!-- after / electron-pro / so-762011-let-vs-var / run 3 -->

**Duration**: 51.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a comprehensive breakdown of `let` vs `var`:

---

## 1. Scoping Rules

`var` is **function-scoped** — it lives for the entire function, ignoring inner blocks like `if` or `for`.

`let` is **block-scoped** — it lives only within the nearest enclosing `{}`.

```js
function example() {
  if (true) {
    var x = 'var';
    let y = 'let';
  }
  console.log(x); // 'var'  — leaks out of the if-block
  console.log(y); // ReferenceError
}
```

---

## 2. Hoisting and the Temporal Dead Zone (TDZ)

Both are hoisted, but differently:

- `var` is hoisted **and initialised to `undefined`** — accessing it before its declaration silently returns `undefined`.
- `let` is hoisted but **not initialised** — accessing it before its declaration throws a `ReferenceError`. The gap is called the **Temporal Dead Zone**.

```js
console.log(a); // undefined
var a = 5;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 5;
```

---

## 3. Re-declaration

`var` silently allows re-declaring the same name in the same scope. `let` throws a `SyntaxError`.

```js
var name = 'Alice';
var name = 'Bob'; // legal, silently overwrites

let name = 'Alice';
let name = 'Bob'; // SyntaxError
```

---

## 4. Global Object Pollution

Top-level `var` declarations become properties on `window` (browsers) / `global` (Node). `let` does not.

```js
var x = 1;
console.log(window.x); // 1

let y = 1;
console.log(window.y); // undefined
```

---

## 5. The Classic Loop Closure Bug

This was a primary motivation for `let`:

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3, 3, 3
}

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0, 1, 2
}
```

`let` gives each loop iteration its own binding; `var` shares one binding across all iterations.

---

## Quick Reference

| | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisted init | `undefined` | TDZ (ReferenceError) |
| Re-declaration | Allowed | SyntaxError |
| Global property | Yes | No |
| Safe in loop closures | No | Yes |

**Bottom line:** prefer `let` (and `const`) for all new code. Every surprising `var` behaviour is either absent in `let` or made explicit — there's no case where `var` is a better choice in modern JavaScript.