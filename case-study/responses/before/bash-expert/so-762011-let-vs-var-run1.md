<!-- before / bash-expert / so-762011-let-vs-var / run 1 -->

**Duration**: 51.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## `var` vs `let` in JavaScript

### 1. Scoping Rules

`var` is **function-scoped**; `let` is **block-scoped**.

```javascript
function example() {
  if (true) {
    var x = "function-scoped";
    let y = "block-scoped";
  }
  console.log(x); // "function-scoped" — leaks out of the if block
  console.log(y); // ReferenceError
}
```

This is the classic loop gotcha:

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0); // 3, 3, 3
}
for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0); // 0, 1, 2
}
```

`let` creates a new binding per iteration; `var` shares one.

---

### 2. Hoisting & the Temporal Dead Zone (TDZ)

Both are hoisted, but differently:

- `var` — hoisted **and initialised** to `undefined`
- `let` — hoisted but **not initialised**; accessing it before the declaration throws a `ReferenceError`

```javascript
console.log(a); // undefined
console.log(b); // ReferenceError: Cannot access 'b' before initialization

var a = 1;
let b = 2;
```

The gap between entering the scope and the `let` declaration is the **Temporal Dead Zone**. It exists to catch bugs, not just to be annoying.

---

### 3. Re-declaration

```javascript
var name = "Alice";
var name = "Bob";   // fine — silent overwrite

let age = 25;
let age = 30;       // SyntaxError: already declared

let age = 25;
age = 30;           // fine — re-assignment is allowed
```

---

### 4. Global Object Attachment

At the top level of a script, `var` pollutes the global object; `let` does not.

```javascript
var pollutes = true;
let clean = true;

console.log(window.pollutes); // true
console.log(window.clean);    // undefined
```

This matters when you accidentally shadow built-ins (`var Array = ...`).

---

### 5. Practical Guidance

| Feature | `var` | `let` |
|---|---|---|
| Scope | Function/global | Block |
| Hoisting | `undefined` on access before decl | TDZ — `ReferenceError` |
| Re-declaration | Allowed | `SyntaxError` |
| Global property | Yes | No |

**Rule of thumb for modern JS:**

1. Use `const` by default.
2. Use `let` when you need to reassign.
3. Avoid `var` — it exists for legacy reasons.

The only time `var` is still reasonable is when maintaining older codebases that predate ES6, or when you specifically need function-scoped semantics (which is rare and usually a design smell anyway).