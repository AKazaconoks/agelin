<!-- after / full-stack-developer / so-762011-let-vs-var / run 1 -->

**Duration**: 56.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown of `let` vs `var`:

---

## 1. Scoping Rules

`var` is **function-scoped** — visible anywhere within the enclosing function, regardless of `if`/`for`/`{}` blocks.

`let` is **block-scoped** — confined to the nearest `{}` block.

```js
function scopeDemo() {
  if (true) {
    var x = 'var';   // scoped to the whole function
    let y = 'let';   // scoped to this if-block only
  }
  console.log(x); // 'var'  — accessible
  console.log(y); // ReferenceError
}
```

Loop variables are the classic pain point:
```js
for (var i = 0; i < 3; i++) {}
console.log(i); // 3 — leaked out

for (let j = 0; j < 3; j++) {}
console.log(j); // ReferenceError — contained
```

---

## 2. Hoisting Behaviour

Both are hoisted, but differently:

- `var` is hoisted **and initialised to `undefined`** — you can read it before its declaration line.
- `let` is hoisted but **not initialised** — reading it before the declaration throws a `ReferenceError`.

```js
console.log(a); // undefined
var a = 10;

console.log(b); // ReferenceError
let b = 10;
```

---

## 3. Re-declaration Rules

```js
var name = 'Alice';
var name = 'Bob';    // silent, no error

let city = 'Paris';
let city = 'Rome';   // SyntaxError — caught at parse time
```

---

## 4. Temporal Dead Zone (TDZ)

The TDZ is the period from the start of the block to the `let` declaration. Any access during this window throws a `ReferenceError`:

```js
{
  console.log(value); // ReferenceError — inside TDZ
  let value = 42;
  console.log(value); // 42
}
```

It even applies to `typeof`, unlike `var`:
```js
console.log(typeof undeclaredVar); // 'undefined' — no error (legacy)
console.log(typeof tdzVar);        // ReferenceError
let tdzVar = 1;
```

---

## 5. Global Object Attachment

At the top level of a script, `var` creates a property on `window`/`globalThis`; `let` does not:

```js
var globalVar = 'on window';
let globalLet = 'not on window';

console.log(window.globalVar); // 'on window'
console.log(window.globalLet); // undefined
```

---

## 6. Per-Iteration Loop Bindings (the big practical win)

Each `let` iteration gets its **own fresh binding** — this fixes the classic async-in-a-loop bug:

```js
// var — all callbacks share the same `i`
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 3, 3, 3

// let — each iteration has its own `i`
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// Prints: 0, 1, 2
```

---

## Quick Reference

| Feature | `var` | `let` |
|---|---|---|
| Scope | Function / global | Block |
| Hoisting | Yes, initialised as `undefined` | Yes, uninitialised (TDZ) |
| Re-declaration | Allowed | SyntaxError |
| TDZ | No | Yes |
| Attaches to `globalThis` | Yes (top-level scripts) | No |
| Per-iteration loop binding | No | Yes |

---

**Recommendation:** Use `let` (and `const`) in all new code. The stricter scoping and TDZ surface bugs at the exact point of misuse — rather than silently producing `undefined` deep in the call stack. `var` is effectively legacy at this point.