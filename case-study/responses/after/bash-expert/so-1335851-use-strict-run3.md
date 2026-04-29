<!-- after / bash-expert / so-1335851-use-strict / run 3 -->

**Duration**: 42.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown of `"use strict"`:

---

## What is `"use strict"`?

It's a **pragma directive** introduced in **ECMAScript 5 (2009)** that opts your code into JavaScript's **strict mode** — a stricter parsing and error-handling mode. It was implemented as a string literal so older engines would silently ignore it (backward-compatible by design).

---

## Main Behavioral Changes

| Behavior | Non-strict | Strict |
|---|---|---|
| Undeclared variables | Creates global silently | `ReferenceError` |
| Writing to read-only property | Fails silently | `TypeError` |
| Deleting variables/functions | Returns `false` | `SyntaxError` |
| Duplicate parameter names | Allowed | `SyntaxError` |
| Octal literals (`010`) | Equals `8` | `SyntaxError` |
| `this` in plain function calls | `window`/global | `undefined` |
| `eval()` scope | Leaks into outer scope | Own isolated scope |
| `with` statement | Allowed | `SyntaxError` |

The most impactful in practice: **undeclared variables throw** instead of silently polluting the global scope, and **`this` is `undefined`** in standalone function calls instead of pointing to `window`.

---

## Browser Support

All current browsers have supported strict mode since ~2011–2012. It is **not** for future use — it's been production-ready for over a decade.

---

## Is it Still Relevant?

Yes, and here's why:

- **ES6 modules** (`import`/`export`) run in strict mode **automatically** — no declaration needed
- **TypeScript** compiles to strict mode by default
- **React, Vue, Angular** all operate under strict mode assumptions
- For classic `<script>` tags or CommonJS files, you still need to declare it explicitly

**Placement matters:**
- At the top of a file → applies to the whole file
- At the top of a function → applies only to that function

```javascript
// File-level strict mode
"use strict";
x = 5; // ReferenceError

// Function-level strict mode
function safe() {
    "use strict";
    y = 10; // ReferenceError only inside this function
}
```

---

**Bottom line:** `"use strict"` turns silent bugs into loud errors, making code more predictable and easier to debug. Use it in all non-module scripts. In modern ES module or TypeScript projects, it's already active without any declaration.