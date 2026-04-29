<!-- before / electron-pro / so-1335851-use-strict / run 3 -->

**Duration**: 82.0s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 81.99s > 60s

---
Here is a comprehensive breakdown of `"use strict"`:

---

## What Is `"use strict"`?

It's a **directive prologue** — a special string literal that opts JavaScript code into **strict mode**: a restricted, safer variant of the language. It was introduced in **ECMAScript 5 (2009)** as an opt-in mechanism that older engines would safely ignore (a string literal is a harmless no-op), while modern engines would use it to enforce stricter rules.

---

## Placement and Scope

| Placement | Effect |
|---|---|
| First statement in a file/script | Entire script runs in strict mode |
| First statement inside a function | Only that function (and nested ones) |

It must appear **before any other executable code** to be recognized.

---

## Browser Support

All modern browsers and runtimes have supported it since **~2011** (Chrome 13, Firefox 4, Safari 5.1, IE 10, Node.js). It's fully relevant and universally supported — not a future feature.

Note: **ES Modules** (`import`/`export`) and **classes** (ES2015+) are **automatically** in strict mode with no directive needed.

---

## Key Behavioral Changes

### 1. Undeclared variables throw a `ReferenceError`
```js
"use strict";
x = 5; // ReferenceError — no more accidental globals
```

### 2. Writing to read-only properties throws a `TypeError`
```js
"use strict";
const obj = Object.freeze({ a: 1 });
obj.a = 2; // TypeError (silent failure in sloppy mode)
```

### 3. Duplicate parameter names are a syntax error
```js
"use strict";
function f(a, a) {} // SyntaxError
```

### 4. `with` statement is forbidden
```js
"use strict";
with (obj) {} // SyntaxError
```

### 5. `this` in plain function calls is `undefined`, not `window`
```js
"use strict";
function f() { console.log(this); } // undefined (not window)
f();
```

### 6. `eval` gets its own scope — no variable leakage
```js
"use strict";
eval("var x = 10;");
console.log(x); // ReferenceError
```

### 7. `arguments` no longer aliases named parameters
```js
"use strict";
function f(a) { a = 99; console.log(arguments[0]); } // 1, not 99
f(1);
```

### 8. Octal literals are forbidden
```js
"use strict";
var n = 077; // SyntaxError
```

### 9. `arguments.callee` / `arguments.caller` throw
### 10. Future reserved words (`implements`, `interface`, `package`, `private`, `public`, `static`, `yield`) cannot be used as identifiers

---

## Bottom Line

Use `"use strict"` at the top of every script not already in an ES Module or class. It catches bugs early (accidental globals, silent failures, typos), enables engine optimizations, and is universally supported. JSLint's warning is well-founded.