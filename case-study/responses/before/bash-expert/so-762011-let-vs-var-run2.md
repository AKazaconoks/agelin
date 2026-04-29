<!-- before / bash-expert / so-762011-let-vs-var / run 2 -->

**Duration**: 49.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a full breakdown of `let` vs `var`:

---

## 1. Scoping Rules

`var` is **function-scoped** — visible anywhere inside the enclosing function, regardless of blocks. `let` is **block-scoped** — confined to the nearest `{}`.

```javascript
function example() {
  if (true) {
    var a = "function scoped";
    let b = "block scoped";
  }
  console.log(a); // "function scoped"
  console.log(b); // ReferenceError
}
```

This bites hardest in loops with callbacks:

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3, 3, 3
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0); // 0, 1, 2
}
```

`let` creates a fresh binding per iteration; `var` shares one binding across all.

---

## 2. Hoisting & the Temporal Dead Zone (TDZ)

Both are hoisted, but `var` is initialized to `undefined` immediately. `let` is hoisted but **not** initialized — accessing it before the declaration throws a `ReferenceError`. The gap between the start of the block and the declaration is called the **Temporal Dead Zone**.

```javascript
console.log(x); // undefined  — var is hoisted+initialized
var x = 1;

console.log(y); // ReferenceError — y is in the TDZ
let y = 1;
```

The TDZ catches bugs that `var`'s silent `undefined` would hide.

---

## 3. Re-declaration

`var` lets you re-declare the same name silently (common source of bugs). `let` throws a `SyntaxError`:

```javascript
var name = "Alice";
var name = "Bob"; // fine — last one wins silently

let name = "Alice";
let name = "Bob"; // SyntaxError: already declared
```

---

## 4. Global Object Attachment

Top-level `var` declarations attach to `window` (browser) / `global` (Node). `let` does not:

```javascript
var foo = 1;
console.log(window.foo); // 1

let bar = 2;
console.log(window.bar); // undefined
```

Leaking onto the global object is rarely desirable — another point in `let`'s favour.

---

## 5. Practical Summary

| | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisted value | `undefined` | TDZ (throws) |
| Re-declare same scope | Yes | No |
| Attaches to global obj | Yes | No |

**Rule of thumb:** use `const` by default, `let` when you need reassignment, and avoid `var` in new code unless you're maintaining legacy scripts or explicitly need function-scoped semantics.