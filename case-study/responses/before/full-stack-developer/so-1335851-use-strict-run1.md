<!-- before / full-stack-developer / so-1335851-use-strict / run 1 -->

**Duration**: 78.9s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 78.94s > 60s

---
## JavaScript `"use strict"` — A Comprehensive Guide

### Background & History

JavaScript was designed in 1995 under time pressure, producing many quirky and dangerous behaviors. For years, fixing these was impossible without breaking existing websites. The solution arrived with **ECMAScript 5 (December 2009)**: an opt-in "strict mode" that lets you voluntarily use a safer subset of the language.

The directive was deliberately made a **string literal** (not a keyword) so older engines would treat it as a harmless no-op expression and keep running normally.

---

### How to Enable It

```javascript
// Entire file/script
"use strict";

function foo() { ... }
```

```javascript
// Single function only
function foo() {
    "use strict";
    // strict rules apply here
}
```

> **Note:** ES6 modules (`import`/`export`) and class bodies are **always** in strict mode automatically — no directive needed.

---

### Key Behavioral Changes

| Behavior | Sloppy Mode | Strict Mode |
|---|---|---|
| Assigning to undeclared variable | Creates a global silently | `ReferenceError` |
| Writing to read-only property | Fails silently | `TypeError` |
| Duplicate parameter names | Allowed (last wins) | `SyntaxError` |
| `with` statement | Allowed | `SyntaxError` |
| `this` in plain function call | `window` / global | `undefined` |
| Primitive `this` via `.call()` | Boxed to object | Kept as primitive |
| `arguments` ↔ parameter binding | Live two-way link | Independent copy |
| `arguments.callee` | Accessible | `TypeError` |
| Octal literals (`012`) | Treated as octal | `SyntaxError` |
| `eval` variable leakage | Leaks into outer scope | Sandboxed |
| Future reserved words as identifiers | Allowed | `SyntaxError` |

---

### Notable Examples

**Accidental globals become errors:**
```javascript
"use strict";
x = 10; // ReferenceError: x is not defined
        // (sloppy mode silently created window.x)
```

**`this` is no longer the global:**
```javascript
"use strict";
function showThis() { console.log(this); }
showThis();          // undefined  (strict)
                     // window     (sloppy)
```

**Duplicate parameters are caught:**
```javascript
"use strict";
function add(a, a) { ... } // SyntaxError — previously silently dropped first `a`
```

**`arguments` is no longer a live alias:**
```javascript
function strictFn(a) {
    "use strict";
    arguments[0] = 99;
    console.log(a); // still 1, not 99
}
```

---

### Browser Support

Universal since **2011**. Chrome 13, Firefox 4, Safari 5.1, IE10+, all versions of Edge and Node.js. Effectively **100% supported** in any browser you'd target today.

---

### Is It Still Relevant?

- **ES6 modules / bundlers (Webpack, Vite, etc.):** Strict mode is automatic — no directive needed.
- **TypeScript:** The compiler handles it; the type checker catches most of the same issues anyway.
- **Traditional `<script>` tags:** Still relevant — `"use strict"` is your only opt-in mechanism.
- **Node.js with `"type": "module"`:** Automatically strict.

The directive itself is less commonly hand-written today because modern tooling absorbs that responsibility, but the protections it provides are active in virtually all modern JavaScript. JSLint flags its absence because it can't always infer your execution context, so it asks you to be explicit.