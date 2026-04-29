<!-- after / full-stack-developer / so-1335851-use-strict / run 2 -->

**Duration**: 62.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 62.50s > 60s

---
## JavaScript's `"use strict"` — A Comprehensive Guide

### What Is It?

`"use strict"` is a **directive** (not a statement) that opts your JavaScript code into a restricted, safer variant of the language called **Strict Mode**. It was designed to catch common coding mistakes and "unsafe" actions by throwing errors for things that would otherwise fail silently.

The reason it looks like a plain string literal is intentional: it is backwards-compatible. Older engines that do not understand it simply evaluate a harmless string expression and move on. Engines that do understand it activate the stricter parsing rules.

---

### History and Origin

| Year | Event |
|------|-------|
| 2009 | Introduced in **ECMAScript 5 (ES5)**, published December 2009 |
| 2010–2011 | First browser implementations (Firefox 4, Chrome 13, IE 10, Safari 5.1) |
| 2015 | **ES6 modules** are strict mode by default — no directive needed |
| Today | All modern engines fully support it |

Douglas Crockford (author of JSLint) was a strong advocate for strict mode from the start — which is exactly why JSLint complains when it is missing.

---

### Where to Place It

**File-level (global strict mode)** — first statement of a `.js` file:
```js
"use strict";

var x = 5; // entire file runs in strict mode
```

**Function-level (scoped)** — first statement inside a function:
```js
function strictFunction() {
  "use strict";
  // only this function is strict
}
```

**ES6 Modules** — automatic, no directive needed:
```html
<script type="module" src="app.js"></script>
```

---

### Key Behavioural Changes

**1. No implicit globals** — assigning to an undeclared variable throws a `ReferenceError` instead of silently creating a global.

**2. Silent failures become errors** — writing to non-writable/getter-only properties throws `TypeError`.

**3. Duplicate parameter names forbidden:**
```js
"use strict";
function add(a, a, c) { } // SyntaxError
```

**4. `this` is `undefined` in plain function calls** — instead of defaulting to `window`, preventing accidental global pollution.

**5. `with` statement is forbidden** — was a performance/correctness hazard.

**6. `eval` is sandboxed** — can't leak variables into surrounding scope.

**7. `arguments` decoupled from named parameters** — changing one no longer changes the other.

**8. Octal literals forbidden:** `var n = 010` → `SyntaxError`.

**9. Deleting variables/function names forbidden.**

---

### Quick Reference

| Behaviour | Sloppy Mode | Strict Mode |
|-----------|-------------|-------------|
| Undeclared variable assignment | Creates global | `ReferenceError` |
| `this` in plain function call | `window` / global | `undefined` |
| Duplicate parameter names | Allowed | `SyntaxError` |
| `with` statement | Allowed | `SyntaxError` |
| Writing to read-only property | Silent no-op | `TypeError` |
| `eval` scope leakage | Leaks into caller | Sandboxed |

---

### Browser Support

Full support has been universal for over a decade — Chrome 13, Firefox 4, Safari 5.1 (all 2011), IE10 (2012). No compatibility concerns today.

---

### Is It Still Relevant?

**Yes, but the context has shifted:**

- **ES modules** (standard today) are automatically strict — no directive needed.
- **Transpilers** (Babel, TypeScript) emit `"use strict"` for you in their output.
- **Plain scripts** (non-module `<script>` tags, Node.js CommonJS) still benefit from it and ESLint still recommends it there.

You rarely type it by hand anymore, but the mechanism is more active than ever — ES6 class bodies, modules, and many modern features are implicitly strict. Understanding it explains why certain patterns (accidental globals, `with`, duplicate params) simply don't exist in modern JavaScript.