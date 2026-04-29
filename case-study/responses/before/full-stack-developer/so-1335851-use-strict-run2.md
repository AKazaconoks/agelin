<!-- before / full-stack-developer / so-1335851-use-strict / run 2 -->

**Duration**: 82.8s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 82.84s > 60s

---
## JavaScript `"use strict"` — A Comprehensive Guide

---

### What is it and where did it come from?

`"use strict"` was introduced in **ECMAScript 5 (ES5)**, published in December 2009. It lets you opt into a stricter, safer variant of JavaScript without breaking the vast amount of legacy code already on the web.

The clever trick: it's written as a **string literal** — not a new keyword — so older engines that didn't understand it would simply evaluate the string and move on harmlessly. Newer engines activate strict mode. This is called a **prologue directive**.

---

### How do you use it?

**File/script level** (entire file is strict):
```js
"use strict";
// all code here is strict
```

**Function level** (only that function is strict):
```js
function myFunction() {
    "use strict";
    // only this function is strict
}
```

---

### Is it still relevant?

Nuanced answer:

- **ES6 Modules** (`<script type="module">`, `import`/`export`) — **strict by default**, no directive needed.
- **`class` bodies** — **strict by default**.
- **Classic `<script>` tags** and **Node.js CommonJS** (`require`) — **still sloppy by default**, so `"use strict"` still matters.
- Linters like JSLint and ESLint flag its absence in non-module code as a best-practice warning.

---

### Browser support

All major browsers and Node.js have supported it since ~2011. It is universally available — compatibility is not a concern for any modern target.

---

### Main behavioural changes

| Behaviour | Sloppy Mode | Strict Mode |
|---|---|---|
| Undeclared variable assignment | Creates global silently | `ReferenceError` |
| Writing to read-only property | Silent no-op | `TypeError` |
| Writing to getter-only property | Silent no-op | `TypeError` |
| Deleting non-configurable property | Returns `false` | `TypeError` |
| Duplicate parameter names | Last one wins | `SyntaxError` |
| `with` statement | Allowed | `SyntaxError` |
| `eval` variable leakage | Leaks to outer scope | Sandboxed |
| `this` in plain function calls | Global object | `undefined` |
| `arguments` aliasing parameters | Linked | Independent snapshot |
| `arguments.callee` | Accessible | `TypeError` |
| Octal literals (`0755`) | Interpreted as octal | `SyntaxError` |
| Future reserved words as identifiers | Allowed | `SyntaxError` |

---

### The most practically important changes

1. **Undeclared variables throw** — a typo in a variable name no longer silently creates a global, one of the most insidious JavaScript bugs.
2. **`this` is `undefined` in plain function calls** — in sloppy mode, `this` would be `window`/`global`, causing accidental global mutation.
3. **`with` is banned** — it made scope resolution ambiguous and blocked engine optimisations.
4. **`eval` is sandboxed** — variables declared inside `eval()` no longer leak into the surrounding scope.

---

### Bottom line

`"use strict"` is a backward-compatible opt-in to a safer JavaScript. Every error it surfaces is almost always a real bug. For any script not using ES modules or class syntax, placing `"use strict"` at the top of every file is still widely considered best practice.