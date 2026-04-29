<!-- before / bash-expert / so-762011-let-vs-var / run 3 -->

**Duration**: 37.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a complete breakdown of `let` vs `var`:

---

## 1. Scoping Rules

**`var`** is **function-scoped** — it leaks out of blocks like `if`, `for`, `while`.  
**`let`** is **block-scoped** — contained within the nearest `{}`.

```javascript
function scopeExample() {
  if (true) {
    var x = "function scoped";
    let y = "block scoped";
  }
  console.log(x); // "function scoped"
  console.log(y); // ReferenceError
}
```

---

## 2. Hoisting & the Temporal Dead Zone (TDZ)

Both are hoisted, but differ in initialisation:

- **`var`** is hoisted and initialised to `undefined` immediately.
- **`let`** is hoisted but **not initialised** — accessing it before the declaration line throws a `ReferenceError`. This gap is called the **Temporal Dead Zone**.

```javascript
console.log(a); // undefined  (var)
var a = 1;

console.log(b); // ReferenceError  (TDZ)
let b = 1;
```

The TDZ makes bugs more visible — a `var` silently returns `undefined` where `let` tells you something is wrong.

---

## 3. Re-declaration

```javascript
var name = "Alice";
var name = "Bob";   // fine, silently overwrites

let name = "Alice";
let name = "Bob";   // SyntaxError — already declared
```

---

## 4. Global Object Pollution

At the top level, `var` attaches to `window` / `globalThis`; `let` does not.

```javascript
var foo = 1;
console.log(window.foo);   // 1

let bar = 2;
console.log(window.bar);   // undefined
```

---

## 5. Loop Closures (Classic Gotcha)

```javascript
// var — all callbacks share the same `i`, logs 3, 3, 3
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}

// let — each iteration gets its own binding, logs 0, 1, 2
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
```

---

## When to Use Each

| | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisted & initialised | Yes (`undefined`) | No (TDZ) |
| Re-declare in same scope | Yes | No |
| Adds to `window` | Yes | No |

**Default to `let`** (or `const` for values that never change). It has more predictable scope, surfaces bugs earlier via the TDZ, avoids accidental global pollution, and fixes the loop-closure pitfall. Only reach for `var` when intentionally working with legacy code that depends on its specific behaviour.