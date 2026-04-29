<!-- after / bash-expert / so-762011-let-vs-var / run 3 -->

**Duration**: 41.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a comprehensive breakdown of `let` vs `var`:

---

## 1. Scoping Rules

**`var`** is **function-scoped** — visible throughout the entire containing function.
**`let`** is **block-scoped** — visible only within the nearest `{}` block.

```javascript
function scopeExample() {
  if (true) {
    var x = "var";
    let y = "let";
  }
  console.log(x); // "var"  ✓
  console.log(y); // ReferenceError ✗
}
```

The classic loop closure bug illustrates this perfectly:

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 3, 3, 3
}

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 100); // 0, 1, 2
}
```

---

## 2. Hoisting Behaviour

Both are hoisted, but differently:

- **`var`** is hoisted *and* initialized to `undefined`.
- **`let`** is hoisted but stays **uninitialized** — accessing it before its declaration throws a `ReferenceError`.

```javascript
console.log(a); // undefined
console.log(b); // ReferenceError: Cannot access 'b' before initialization

var a = 1;
let b = 2;
```

---

## 3. Temporal Dead Zone (TDZ)

The period between when a `let` binding is hoisted and when execution reaches its declaration is called the **TDZ**. Any read or write in this window is a hard error — even `typeof` isn't safe.

```javascript
{
  console.log(typeof x); // ReferenceError (x is in TDZ)
  let x = 5;
}
```

This is actually a feature — it forces you to declare before use.

---

## 4. Re-declaration

```javascript
var name = "Alice";
var name = "Bob";  // Silent overwrite — no error

let age = 30;
let age = 31;      // SyntaxError: already declared
```

---

## 5. Global Object Pollution

At the top level, `var` attaches to `window` (browsers); `let` does not.

```javascript
var foo = 1;
let bar = 2;

console.log(window.foo); // 1
console.log(window.bar); // undefined
```

---

## When to Use What

| | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisted value | `undefined` | Uninitialized (TDZ) |
| Re-declare | Yes | No |
| Global property | Yes | No |

**Rule of thumb for modern JS:**

1. Use **`const`** by default.
2. Use **`let`** when the variable needs reassignment.
3. Avoid **`var`** — its scoping rules are a historical footgun.

The only reason to reach for `var` today is legacy code compatibility or a rare case where you explicitly need function-scoped hoisting behavior.