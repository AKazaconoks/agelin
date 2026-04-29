<!-- after / bash-expert / so-762011-let-vs-var / run 1 -->

**Duration**: 34.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a full breakdown of `let` vs `var`:

---

## 1. Scoping Rules

**`var` is function-scoped** — it leaks out of blocks like `if`, `for`, etc.:
```javascript
function example() {
  if (true) { var x = 1; }
  console.log(x); // 1 — accessible outside the if-block
}
```

**`let` is block-scoped** — confined to the nearest `{}`:
```javascript
function example() {
  if (true) { let y = 1; }
  console.log(y); // ReferenceError: y is not defined
}
```

---

## 2. Hoisting & the Temporal Dead Zone (TDZ)

Both are hoisted, but behave differently:

**`var` initialises to `undefined` immediately:**
```javascript
console.log(x); // undefined
var x = 5;
```

**`let` enters the TDZ — access before the declaration line throws:**
```javascript
console.log(y); // ReferenceError: Cannot access 'y' before initialization
let y = 5;
```

The variable exists but is uninitialised until execution reaches its `let` line. This catches bugs that `var` silently hides.

---

## 3. Re-declaration

```javascript
var name = "Alice";
var name = "Bob"; // fine — silently overwrites

let name = "Alice";
let name = "Bob"; // SyntaxError — caught at parse time
```

---

## 4. Global Object Attachment

```javascript
var a = "pollutes window";
console.log(window.a); // "pollutes window"

let b = "clean";
console.log(window.b); // undefined
```

---

## 5. Loop/Closure Gotcha (the classic trap)

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 3, 3, 3 — one shared binding
}

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // 0, 1, 2 — new binding per iteration
}
```

---

## When to use what

| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | Block | Block |
| Re-assignable | Yes | Yes | No |
| Re-declarable | Yes | No | No |
| TDZ | No | Yes | Yes |
| Global property | Yes | No | No |

**Rule of thumb for modern JS:** default to `const`; use `let` when you need to reassign; avoid `var` in new code. The only reason to reach for `var` today is legacy browser compatibility or intentional function-scoped hoisting (rare).