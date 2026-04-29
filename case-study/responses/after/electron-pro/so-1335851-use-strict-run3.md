<!-- after / electron-pro / so-1335851-use-strict / run 3 -->

**Duration**: 19.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## JavaScript `"use strict"`

`"use strict"` is a **directive** introduced in ECMAScript 5 (ES5, 2009) that opts your code into *strict mode* — a restricted variant of JavaScript that catches common mistakes and unsafe patterns by throwing errors instead of silently ignoring them.

---

### How to enable it

**File/function scope:**
```js
"use strict"; // top of file — applies to everything below

function foo() {
  "use strict"; // applies only to this function
}
```

**ES Modules** (`.mjs`, or `type="module"`) are **always** in strict mode — no directive needed.

---

### Key behavioural changes

| Behaviour | Sloppy mode | Strict mode |
|---|---|---|
| Undeclared variable | Creates global silently | `ReferenceError` |
| Deleting a variable/function | Silently fails | `SyntaxError` |
| Duplicate parameter names | Allowed | `SyntaxError` |
| `with` statement | Allowed | `SyntaxError` |
| `this` in plain function call | `window` / global | `undefined` |
| Writing to read-only property | Silently fails | `TypeError` |
| Octal literals (`0777`) | Allowed | `SyntaxError` |
| `eval` / `arguments` as identifiers | Allowed | `SyntaxError` |
| `eval` leaking variables into scope | Leaks | Contained to eval scope |

---

### Concrete examples

```js
// 1. Catches typos / undeclared vars
"use strict";
mistypedVar = 5; // ReferenceError — would silently create a global otherwise

// 2. Safer `this` in callbacks
function Timer() {
  "use strict";
  setTimeout(function() {
    console.log(this); // undefined, not window — prevents accidental global mutation
  }, 100);
}

// 3. No silent property-write failures
"use strict";
const obj = Object.freeze({ x: 1 });
obj.x = 2; // TypeError — silent in sloppy mode
```

---

### Is it still relevant?

**Yes, absolutely**, but the context has shifted:

- **ES Modules** (`import`/`export`) are strict by default — most modern bundler (Webpack, Vite, esbuild) output uses modules, so the directive is implicit.
- **Classes** are always strict mode.
- For **legacy scripts** (plain `<script>` tags, older Node.js CommonJS files), the directive is still meaningful.
- **JSLint/ESLint** still flag its absence in non-module code as a best practice.

**Browser support:** All modern browsers (Chrome, Firefox, Safari, Edge) and Node.js have fully supported strict mode since ~2012. It is not a future-use hint — it is actively enforced.

---

### Rule of thumb

- Writing ES modules or using a bundler? Strict mode is already on.
- Writing a bare `<script>` or CommonJS module? Add `"use strict"` at the top.
- Never rely on sloppy-mode quirks — they exist only for backwards compatibility with pre-2009 code.