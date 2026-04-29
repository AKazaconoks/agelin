<!-- before / full-stack-developer / so-762011-let-vs-var / run 3 -->

**Duration**: 56.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown of `let` vs `var`:

---

## 1. Scoping Rules

**`var` is function-scoped** — it leaks out of blocks like `if` and `for`.
**`let` is block-scoped** — it is confined to the nearest `{}`.

```javascript
function scopeDemo() {
  if (true) {
    var x = 'I am var';
    let y = 'I am let';
  }
  console.log(x); // "I am var"  — leaked out
  console.log(y); // ReferenceError
}
```

This matters most in loops — a classic footgun:

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 3, 3, 3  (all share the same i)

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// Output: 0, 1, 2  (each iteration gets its own i)
```

---

## 2. Hoisting & the Temporal Dead Zone (TDZ)

Both are hoisted, but differently:

- **`var`** is hoisted *and initialized to `undefined`*, so reading it before its declaration silently returns `undefined`.
- **`let`** is hoisted but **not initialized**. Accessing it before the declaration line throws a `ReferenceError` — this zone is called the **Temporal Dead Zone**.

```javascript
console.log(a); // undefined  (var — silent bug)
var a = 1;

console.log(b); // ReferenceError (let — loud, immediate)
let b = 1;
```

The TDZ is a feature: it turns silent bugs into obvious errors.

---

## 3. Re-declaration

```javascript
var user = 'Alice';
var user = 'Bob'; // Fine — silently overwrites

let user = 'Alice';
let user = 'Bob'; // SyntaxError — caught before code even runs
```

Re-*assignment* is still valid with `let`:

```javascript
let user = 'Alice';
user = 'Bob'; // OK
```

---

## 4. Global Object Property

At the top level of a script:

```javascript
var appName = 'MyApp';
let appVersion = '2.0';

console.log(globalThis.appName);    // "MyApp"
console.log(globalThis.appVersion); // undefined
```

`var` pollutes `globalThis` (`window` in browsers), risking collisions with built-ins like `window.name` or `window.status`. `let` does not.

---

## 5. Practical Guidance

**The modern rule:**

| Situation | Keyword |
|---|---|
| Binding never reassigned | `const` |
| Binding needs reassignment | `let` |
| Legacy code only | `var` |

- **Default to `const`.** Use `let` only when you know the value must change (loop counters, accumulators, conditionally-set values).
- **Never write `var` in modern code.** There is no modern scenario where `var` is the better choice. ESLint's `no-var` rule enforces this.

```javascript
const MAX_RETRIES = 3;        // never changes — const
let attempts = 0;             // will be incremented — let
for (let i = 0; i < 10; i++) // loop counter — let
```

---

## Summary

| Behavior | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisted | Yes, `undefined` | Yes, but TDZ (uninitialized) |
| Pre-declaration access | `undefined` | `ReferenceError` |
| Re-declaration | Allowed | `SyntaxError` |
| Attaches to `globalThis` | Yes | No |
| Use in modern code | Avoid | When reassignment is needed |