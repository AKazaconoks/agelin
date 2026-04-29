<!-- before / full-stack-developer / so-762011-let-vs-var / run 1 -->

**Duration**: 36.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## `let` vs `var` in JavaScript

### 1. Scoping Rules

The most fundamental difference: `var` is **function-scoped**, `let` is **block-scoped** (confined to the nearest `{}`).

```javascript
function scopeDemo() {
    if (true) {
        var x = "I am var";
        let y = "I am let";
    }
    console.log(x); // "I am var"  — leaks out of the if-block
    console.log(y); // ReferenceError: y is not defined
}
```

---

### 2. Hoisting Behaviour

Both are hoisted, but differently:

- `var` is hoisted **and initialised to `undefined`** — readable before its declaration line.
- `let` is hoisted but **not initialised** — accessing it before its declaration throws a `ReferenceError`.

```javascript
console.log(a); // undefined
var a = 10;

console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 10;
```

The gap between the start of a block and where `let` is initialised is called the **Temporal Dead Zone (TDZ)**. It surfaces bugs rather than silently producing `undefined`.

---

### 3. Other Practical Differences

**Global object property** — `var` at the top level attaches to `window`; `let` does not:

```javascript
var globalVar = "hi";
let globalLet = "hi";

console.log(window.globalVar); // "hi"
console.log(window.globalLet); // undefined
```

**Re-declaration** — `var` silently allows it; `let` is a syntax error:

```javascript
var name = "Alice";
var name = "Bob";   // fine, overwrites silently

let city = "Paris";
let city = "Rome";  // SyntaxError: already declared
```

**Loops and closures** — `var` shares one binding across all iterations; `let` creates a fresh one per iteration:

```javascript
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0);
}
// Prints: 3, 3, 3

for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 0);
}
// Prints: 0, 1, 2
```

---

### Quick Reference

| Feature | `var` | `let` |
|---|---|---|
| Scope | Function | Block `{}` |
| Hoisting | Yes, initialised as `undefined` | Yes, but Temporal Dead Zone |
| Global object property | Yes (`window.x`) | No |
| Re-declaration | Allowed | SyntaxError |
| Loop closure | Shares one binding | Fresh binding per iteration |

**Bottom line:** Use `let` (and `const`) in all modern JavaScript. `var`'s quirks exist purely for historical reasons — `let` replicates everything it does, more safely.