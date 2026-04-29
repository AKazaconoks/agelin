<!-- after / full-stack-developer / so-1335851-use-strict / run 3 -->

**Duration**: 61.8s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 61.82s > 60s

---
## JavaScript `"use strict"` — Complete Explanation

---

### What is it?

`"use strict"` is a **directive prologue** — a special string literal placed at the top of a script or function body to opt that code into JavaScript's *strict mode*. It was introduced in **ECMAScript 5 (ES5, December 2009)** as a backward-compatible way to enforce a safer dialect of JavaScript.

Older engines simply evaluate it as a harmless string expression and move on. Modern engines recognise it and change how they parse and execute the surrounding code.

**Two scopes:**
```js
// File/script scope — applies to everything in this file
"use strict";

// Function scope — applies only inside this function
function doSomething() {
    "use strict";
    // ...
}
```

---

### Is it still relevant?

Yes, but with nuance — its relevance has *shifted* rather than diminished:

- **ES Modules** (`import`/`export`) are automatically in strict mode — no directive needed. This covers most modern React/Vue/Node.js code.
- **Class bodies** are always strict unconditionally.
- **Bundlers/transpilers** (Babel, TypeScript, Webpack) emit strict-mode output regardless.
- **Where you still need it explicitly:** legacy `<script>` tags, CommonJS Node.js modules, and any plain JS without a build pipeline — exactly what JSLint targets.

---

### Do browsers respond to it?

**Yes, fully and universally.** It's been production-ready for over a decade:

| Engine | Browser | Support since |
|---|---|---|
| V8 | Chrome/Edge | Chrome 13 (2011) |
| SpiderMonkey | Firefox | Firefox 4 (2011) |
| JavaScriptCore | Safari | Safari 5.1 (2011) |

---

### Key behavioural changes

**1. Undeclared variables throw `ReferenceError`** (instead of silently creating globals)
```js
"use strict";
result = 42; // ReferenceError: result is not defined
```

**2. `this` is `undefined` in plain function calls** (instead of pointing to `window`/`global`)
```js
"use strict";
function showThis() { console.log(this); } // undefined, not window
showThis();
```

**3. Silent failures become thrown `TypeError`s** — writing to read-only properties, non-extensible objects, getter-only properties all throw instead of silently doing nothing.

**4. Duplicate parameter names banned**
```js
"use strict";
function add(a, a) { } // SyntaxError
```

**5. `with` statement banned entirely** — it made static analysis impossible and was a known bug source.

**6. `eval` is sandboxed** — variables declared inside `eval` no longer leak into the surrounding scope.

**7. `arguments` object decoupled** — in sloppy mode, `arguments[0]` and the named parameter `a` are live-linked; strict mode breaks that.

**8. Future reserved words protected** — `let`, `static`, `yield`, `implements`, etc. cannot be used as variable names.

---

### Bottom line

`"use strict"` was the ECMAScript committee's pragmatic fix for JavaScript's worst design mistakes without breaking existing code. In modern module-based codebases it activates automatically; in traditional script-based codebases (exactly what JSLint targets), the explicit directive is needed. Either way — you want it.