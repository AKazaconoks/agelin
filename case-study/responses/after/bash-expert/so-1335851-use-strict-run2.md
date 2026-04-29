<!-- after / bash-expert / so-1335851-use-strict / run 2 -->

**Duration**: 49.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## What is `"use strict"`?

`"use strict"` is a **directive** that enables JavaScript's strict mode, introduced in **ECMAScript 5 (ES5, 2009)**. It tells the JS engine to apply stricter parsing and error-handling rules. The string-literal syntax was chosen deliberately for backward compatibility — engines that don't understand it simply see a harmless no-op string.

---

## Is it still relevant?

**Yes, very much so** — though in modern JS it often applies automatically:

- **ES6 modules** (`import`/`export`) are always in strict mode
- **Class bodies** always run in strict mode
- **TypeScript** enforces it by default in many configs
- For legacy `<script>` tags and non-module scripts, you still need to declare it explicitly

---

## Browser support

All current browsers have supported it fully since ~2011–2012 (Chrome 13, Firefox 4, Safari 5.1, IE 10, all Edge versions). It is not a future-use feature — it's been production-ready for over a decade.

---

## Key behavioral changes

| Behavior | Without strict mode | With strict mode |
|---|---|---|
| Undeclared variables | Creates a global silently | `ReferenceError` |
| Writing to read-only property | Silently fails | `TypeError` |
| `delete` a variable/function | Silently fails | `SyntaxError` |
| Duplicate function parameter names | Allowed | `SyntaxError` |
| Octal literals (`0755`) | Allowed | `SyntaxError` |
| `with` statement | Allowed | `SyntaxError` |
| `eval()` leaking variables | Leaks into outer scope | Variables stay inside `eval` |
| `this` in plain function call | Global object (`window`) | `undefined` |
| Future reserved words (`implements`, `interface`, etc.) | Usable as identifiers | `SyntaxError` |

---

## Usage

```js
// Whole script
"use strict";
x = 5; // ReferenceError: x is not defined

// Just one function (useful for incrementally hardening legacy code)
function myFunc() {
    "use strict";
    // strict rules apply here only
}

// ES6 modules / classes — automatic, no directive needed
export function myFunc() { /* already strict */ }
class Foo { /* already strict */ }
```

**Bottom line:** always use strict mode (or use ES6 modules/classes which give it for free). It catches real bugs early — accidental globals, silent assignment failures, and confusing `this` values are among the most common sources of hard-to-debug JS issues.