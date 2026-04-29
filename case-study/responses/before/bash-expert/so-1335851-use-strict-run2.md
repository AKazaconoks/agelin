<!-- before / bash-expert / so-1335851-use-strict / run 2 -->

**Duration**: 52.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a comprehensive overview of JavaScript's `"use strict"`:

---

## What is `"use strict"`?

It's a **directive** that enables *strict mode* in JavaScript, introduced in **ECMAScript 5 (ES5, 2009)**. It appears as a string literal at the top of a script or function — older engines that don't support it simply ignore it as a harmless string, ensuring backward compatibility.

Douglas Crockford (JSLint's creator) was a strong advocate for strict mode during ES5's development, which is why JSLint flags its absence.

---

## How to use it

```js
// Global scope (entire script)
"use strict";

// Function scope only
function foo() {
    "use strict";
    // ...
}
```

---

## Main behavioral changes

| Area | Sloppy mode | Strict mode |
|---|---|---|
| **Undeclared variables** | Creates a global silently | `ReferenceError` |
| **`this` in functions** | Global object (`window`) | `undefined` |
| **Duplicate param names** | Silently allowed | `SyntaxError` |
| **`with` statement** | Allowed | `SyntaxError` |
| **`delete` on variables** | Silent no-op | `SyntaxError` |
| **Octal literals** (`010`) | Parsed as `8` | `SyntaxError` |
| **`arguments` ↔ params link** | Linked (mutating one affects other) | No link |
| **Future reserved words** (`static`, `interface`, etc.) | Usable as identifiers | `SyntaxError` |

---

## Key example — `this` binding

```js
function test() {
    console.log(this);
}
test(); // non-strict → Window; strict → undefined
```

---

## Browser support

All modern browsers have supported it for **over a decade**. It is universally safe to use.

---

## Is it still relevant in 2026?

**Yes, but the landscape has shifted:**

- **ES6 modules** are automatically strict — no directive needed
- **Class bodies** are automatically strict
- **TypeScript** and most bundlers enforce it by default
- **Modern frameworks** (React, Vue, Angular) run in strict mode

However, `"use strict"` is still valuable for:
- Legacy scripts not using modules
- Standalone scripts/Node.js scripts
- Ensuring consistent behavior in environments without a bundler

The core principles it enforces — no accidental globals, consistent `this`, catching typos — remain fundamental to writing robust JavaScript regardless of how you deliver it.