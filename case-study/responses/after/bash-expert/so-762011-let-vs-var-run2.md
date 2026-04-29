<!-- after / bash-expert / so-762011-let-vs-var / run 2 -->

**Duration**: 30.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown from the agent:

---

## `let` vs `var` in JavaScript

### 1. Scoping Rules

**`var`** is **function-scoped** — it leaks out of blocks like `if`, `for`, etc.:

```javascript
function example() {
  if (true) {
    var x = 1;
  }
  console.log(x); // 1 — leaked out of the if block
}
```

**`let`** is **block-scoped** — contained to the nearest `{...}`:

```javascript
function example() {
  if (true) {
    let y = 1;
  }
  console.log(y); // ReferenceError: y is not defined
}
```

---

### 2. Hoisting & the Temporal Dead Zone

**`var`** is hoisted and initialized to `undefined`:

```javascript
console.log(x); // undefined — no error
var x = 5;
```

**`let`** is hoisted but sits in the **Temporal Dead Zone (TDZ)** until its declaration is reached. Accessing it early throws:

```javascript
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 5;
```

The TDZ turns silent bugs into loud errors — a good thing.

---

### 3. Re-declaration

```javascript
var name = "Alice";
var name = "Bob";  // Fine — silently overwrites

let name = "Alice";
let name = "Bob";  // SyntaxError — caught immediately
```

---

### 4. Global Object Pollution

```javascript
var globalVar = "hello";
console.log(window.globalVar); // "hello" — attached to window

let globalLet = "hello";
console.log(window.globalLet); // undefined — not attached
```

`var` at the top level bleeds into the global object; `let` does not.

---

### 5. Loop Closure Gotcha

The classic trap with `var`:

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 3, 3, 3 — one shared `i`
}
```

`let` creates a **new binding per iteration**:

```javascript
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 0, 1, 2 — as expected
}
```

---

### 6. Practical Guidance

| | `var` | `let` |
|---|---|---|
| Scope | Function | Block |
| Hoisting | Yes, initializes to `undefined` | Yes, but TDZ (throws on early access) |
| Re-declare | Allowed | SyntaxError |
| Global object | Attaches to `window` | Does not |
| Loop closures | Shared binding | Per-iteration binding |

**Rule of thumb for modern JS:**
- Use **`const`** by default (can't be reassigned).
- Use **`let`** when you need to reassign.
- Avoid **`var`** in new code entirely — its scoping behavior is almost never what you want.