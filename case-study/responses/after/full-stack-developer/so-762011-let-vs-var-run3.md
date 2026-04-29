<!-- after / full-stack-developer / so-762011-let-vs-var / run 3 -->

**Duration**: 47.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a full breakdown of `let` vs `var`:

---

## 1. Scoping Rules

`var` is **function-scoped** — it lives for the entire function regardless of inner blocks. `let` is **block-scoped** — it exists only within the `{}` that encloses it.

```js
function example() {
  if (true) {
    var x = 'var';   // scoped to example()
    let y = 'let';   // scoped to this if-block
  }
  console.log(x);    // "var"
  console.log(y);    // ReferenceError
}
```

The loop case catches people often:

```js
for (var i = 0; i < 3; i++) {}
console.log(i); // 3 — leaks out

for (let j = 0; j < 3; j++) {}
console.log(j); // ReferenceError — stays inside
```

---

## 2. Hoisting & the Temporal Dead Zone (TDZ)

Both are hoisted, but differ in what happens before the declaration line.

`var` is hoisted *and initialised* to `undefined`, so reading it early silently gives you `undefined`:

```js
console.log(a); // undefined (no error)
var a = 10;
```

`let` is hoisted but *not initialised*. The gap between the block's start and the declaration is the **Temporal Dead Zone** — any access throws a `ReferenceError`:

```js
console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 10;
```

The TDZ turns a silent bug (`undefined`) into a loud, descriptive error.

---

## 3. Re-declaration

`var` silently allows re-declaring the same name:

```js
var count = 1;
var count = 2; // no error — silently overwrites
```

`let` throws a `SyntaxError` at parse time:

```js
let count = 1;
let count = 2; // SyntaxError: Identifier 'count' has already been declared
```

Re-*assignment* is still fine: `count = 2` works; `let count = 2` doesn't.

---

## 4. Global Object Attachment

Top-level `var` becomes a property on `window` (browser) / `global` (Node). Top-level `let` does not:

```js
var  a = 1; console.log(window.a); // 1
let  b = 2; console.log(window.b); // undefined
```

---

## 5. Practical Guidance

| | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisted initial value | `undefined` | TDZ (throws) |
| Re-declaration | Allowed | SyntaxError |
| Adds to global object | Yes (top-level) | No |
| Use in new code? | No | Yes (when `const` won't do) |

**The modern rule of thumb:**
- Default to **`const`** — use it whenever the binding won't be reassigned.
- Use **`let`** when you need reassignment (loop counters, accumulators, changing state).
- **Avoid `var`** in new code — there's no modern case where it's the better choice. ESLint's `no-var` rule enforces this.

The one caveat: when patching legacy code that relies on `var`'s function-scoping, a mechanical find-and-replace to `let` can subtly change scoping behaviour — make changes carefully there.