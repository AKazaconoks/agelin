<!-- before / bash-expert / so-1335851-use-strict / run 3 -->

**Duration**: 52.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a comprehensive breakdown of `"use strict"` in JavaScript:

---

## What is `"use strict"`?

It's a **directive** introduced in **ECMAScript 5 (2009)** that opts your script (or function) into a stricter, safer subset of JavaScript. It was designed as a string literal so older engines simply ignore it harmlessly.

---

## Browser Support

Full support in all modern browsers and Node.js — any engine from the last ~15 years handles it. It's not a future feature; it's been standard for a long time.

---

## How to Use It

```javascript
// Global scope
"use strict";
// entire script is strict

// Or per-function
function foo() {
    "use strict";
    // only this function is strict
}
```

> **Note:** ES6 modules are automatically in strict mode — no declaration needed.

---

## Key Behavioral Changes

| Behavior | Sloppy Mode | Strict Mode |
|---|---|---|
| Undeclared variables | Creates a global silently | `ReferenceError` |
| Writing to read-only properties | Silently fails | `TypeError` |
| Deleting undeletable props | Silently fails | `TypeError` |
| Duplicate parameter names | Allowed | `SyntaxError` |
| Octal literals (`077`) | Allowed | `SyntaxError` |
| `this` in regular functions | `window` (global) | `undefined` |
| `with` statement | Allowed | `SyntaxError` |
| `eval` leaking variables | Leaks into outer scope | Stays inside `eval` |
| `arguments` tracking params | Tracks live changes | Snapshot only |
| Future reserved words (`let`, `static`, etc.) | Allowed as identifiers | `SyntaxError` |

---

## Why It Matters

1. **Catches real bugs early** — silent failures become thrown errors
2. **Prevents accidental globals** — the most common JS footgun
3. **Engine optimizations** — V8 and other engines can optimize strict code better
4. **Security** — removes `with`, prevents `eval` scope leakage
5. **Forward compatibility** — reserves keywords for future ECMAScript

---

## Modern Context

In today's JS, strict mode is largely **automatic**:
- ES6 `import`/`export` modules → strict by default
- TypeScript → strict by default
- Most bundlers (Webpack, Vite) and frameworks assume it

The JSLint warning you saw is still valid advice — if you're writing plain `<script>` tags or CommonJS modules, add `"use strict"` at the top. It has no downside in modern code.