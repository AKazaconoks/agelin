<!-- after / full-stack-developer / so-762011-let-vs-var / run 2 -->

**Duration**: 53.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete breakdown of `let` vs `var`:

---

## 1. Scoping Rules

**`var` is function-scoped** — visible anywhere in the enclosing function (or globally), regardless of `{}` blocks.  
**`let` is block-scoped** — confined to the nearest `{}`.

```js
function demoScope() {
  if (true) {
    var x = 'var';
    let y = 'let';
  }
  console.log(x); // 'var'  — leaks out of the if-block
  console.log(y); // ReferenceError
}
```

The classic loop closure bug stems directly from this:

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3, 3, 3  (all share the same `i`)
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0); // 0, 1, 2  (each iteration owns its `j`)
}
```

---

## 2. Hoisting Behaviour

Both are hoisted, but differently.

**`var`** is hoisted *and initialised to `undefined`*, so reading it before the declaration is silently `undefined`:

```js
console.log(a); // undefined  (no error)
var a = 5;
```

**`let`** is hoisted but *not initialised*. The gap between the start of the block and the `let` line is the **Temporal Dead Zone (TDZ)** — any access there throws:

```js
console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 5;
```

The TDZ turns a silent bug into a loud, immediate error.

---

## 3. Other Practical Differences

**Re-declaration** — `var` silently overwrites; `let` throws a `SyntaxError` at parse time:

```js
var count = 1;
var count = 2; // fine, silently overwrites

let total = 1;
let total = 2; // SyntaxError: Identifier 'total' has already been declared
```

**Global object pollution** — top-level `var` adds a property to `window`; `let` does not:

```js
var foo = 'var';
let bar = 'let';
console.log(window.foo); // 'var'
console.log(window.bar); // undefined
```

---

## 4. When to Use `let` vs `var`

| Concern | `var` | `let` |
|---|---|---|
| Block leakage | Silent | `ReferenceError` |
| Use before declaration | Silent `undefined` | `ReferenceError` (TDZ) |
| Re-declaration | Silent overwrite | `SyntaxError` |
| Loop closures | Shared binding (bug-prone) | Per-iteration binding |
| Global namespace | Pollutes `window` | Does not |

**The practical rule of thumb:**

1. **Default to `const`** — if the binding is never reassigned, say so explicitly.
2. **Use `let`** when you need reassignment (loop counters, accumulators, conditional init).
3. **Avoid `var`** — every footgun it has is eliminated by `let`. The only reason to reach for `var` is maintaining legacy code where changing it would alter existing behaviour.