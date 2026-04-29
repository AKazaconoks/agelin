<!-- after / electron-pro / so-1335851-use-strict / run 2 -->

**Duration**: 46.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown of `"use strict"`:

---

## What is it?

`"use strict"` is a **directive prologue** introduced in ES5 (2009). It opts your code into *strict mode* — a restricted variant of JavaScript that turns silent errors into thrown exceptions, disables confusing/unsafe features, and can enable engine optimizations.

It's a plain string literal (not a keyword), so older engines that don't recognize it simply evaluate an unused string and move on — fully backward-compatible.

---

## Key behavioral changes

| Change | Sloppy mode | Strict mode |
|---|---|---|
| Undeclared variables | Creates implicit global | `ReferenceError` |
| `this` in plain function call | `window` / `global` | `undefined` |
| Writing to read-only property | Silent no-op | `TypeError` |
| Duplicate parameter names | Allowed | `SyntaxError` |
| `delete` a variable/function | Silent failure | `SyntaxError` |
| Octal literals (`010`) | Allowed | `SyntaxError` (use `0o10`) |
| `with` statement | Allowed | `SyntaxError` |
| `eval` leaking variables | Leaks into surrounding scope | `eval` has its own scope |

The two changes that catch the most real bugs are the **`this` is `undefined`** rule (prevents accidental globals from constructors called without `new`) and the **must-declare variables** rule.

---

## Where to place it

**File-level** — must be the very first statement:
```js
"use strict";

const x = 1; // everything in this file is strict
```

**Function-level** — for gradually migrating legacy code:
```js
function safeNew() {
  "use strict"; // only this function and its nested functions
  y = 5; // ReferenceError
}

function oldLegacy() {
  z = 10; // still silently creates a global
}
```

---

## Is it still relevant in 2026?

Yes, but context matters:

- **ES Modules** (`import`/`export`) — strict by default, no directive needed
- **Class bodies** — strict by default, no directive needed
- **Modern bundlers** (Vite, webpack, Rollup) — most emit strict-mode output automatically
- **Legacy `<script>` tags / CommonJS** — still very relevant, sloppy mode is the default
- **TypeScript** — TS catches most of the same bugs at compile time, but `"use strict"` still applies at runtime

---

## Browser support

**Universal.** Every browser and Node.js has supported it since ~2011–2012. No polyfill, transpile step, or feature detection needed.

**Bottom line:** Add it to any `.js` file that isn't an ES module and isn't processed by a bundler that handles it for you. It's never harmful to include it explicitly.