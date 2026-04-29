<!-- before / electron-pro / so-762011-let-vs-var / run 3 -->

**Duration**: 47.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete breakdown of `var` vs `let`:

---

## 1. Scoping Rules

`var` is **function-scoped** — visible anywhere inside the enclosing function, regardless of the block it was written in.
`let` is **block-scoped** — confined to the nearest `{}` (if-block, loop, etc.).

```js
function demo() {
  if (true) {
    var x = 'var';  // escapes the if-block
    let y = 'let';  // stays inside the if-block
  }
  console.log(x); // "var"
  console.log(y); // ReferenceError
}

for (var i = 0; i < 3; i++) {}
console.log(i); // 3 — leaked out

for (let j = 0; j < 3; j++) {}
console.log(j); // ReferenceError
```

---

## 2. Hoisting & the Temporal Dead Zone (TDZ)

Both are hoisted, but differently:

- **`var`** is hoisted *and* initialised to `undefined`, so you can read it before the declaration (you just get `undefined`).
- **`let`** is hoisted but left *uninitialised*. Accessing it before the declaration throws a `ReferenceError` — this gap is called the **Temporal Dead Zone**.

```js
console.log(a); // undefined
var a = 10;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 10;
```

The TDZ turns a silent `var` footgun into a loud, immediate error.

---

## 3. Re-declaration

`var` silently allows re-declaring the same name. `let` throws a `SyntaxError` at parse time.

```js
var user = 'Alice';
var user = 'Bob'; // fine — silent overwrite

let user = 'Alice';
let user = 'Bob'; // SyntaxError (re-assignment without `let` is still fine)
```

---

## 4. Global Object Attachment

Top-level `var` creates a property on `window` (browser) / `global` (Node). Top-level `let` does not.

```js
var appName = 'MyApp';
window.appName; // "MyApp"

let appVersion = '1.0';
window.appVersion; // undefined
```

---

## 5. The Classic Loop Closure Bug

This is the most practical day-to-day difference:

```js
// var — all three callbacks print "3" (shared variable)
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3, 3, 3
}

// let — each iteration gets its own binding
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 0, 1, 2
}
```

---

## Summary Table

| Feature | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisting initialisation | `undefined` | Uninitialised (TDZ) |
| Access before declaration | Returns `undefined` | `ReferenceError` |
| Re-declaration | Allowed | `SyntaxError` |
| Attaches to global object | Yes (top level) | No |
| Recommended in modern JS | No | **Yes** |

**Bottom line:** Use `const` by default; use `let` when you need to reassign. Avoid `var` in all new code — its function-scoping and silent behaviours are the source of a whole class of classic JavaScript bugs that `let`/`const` simply eliminate.