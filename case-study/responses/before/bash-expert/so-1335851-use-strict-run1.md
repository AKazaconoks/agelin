<!-- before / bash-expert / so-1335851-use-strict / run 1 -->

**Duration**: 46.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a comprehensive breakdown of `"use strict"` in JavaScript:

---

## What is `"use strict"`?

It's a **pragma directive** introduced in ECMAScript 5 (2009). It's not a real statement — it's a string literal that tells the JavaScript engine to run the enclosing scope in **strict mode**: a more restrictive, error-catching variant of JavaScript.

It was created because early JavaScript was intentionally forgiving (to lower the barrier for beginners), which led to subtle bugs in larger codebases. Strict mode opts you into stricter parsing and execution rules.

---

## Is it still relevant in 2026?

Yes, but context matters:

| Context | Strict mode needed? |
|---|---|
| `<script type="module">` | Auto-applied, no need |
| ES6 `import`/`export` files | Auto-applied, no need |
| Plain `<script>` tags | Yes, add manually |
| Node.js CommonJS (`.cjs`, `require`) | Yes, add manually |
| TypeScript compiled output | Often injected by bundlers |

---

## Browser support

All modern browsers (Chrome, Firefox, Safari, Edge) have fully supported it since ~2012. The clever design: since it's just a string literal, older engines that don't understand it simply **ignore it** — no errors.

---

## Key behavioral changes it triggers

**1. Undeclared variables throw instead of silently creating globals**
```js
"use strict";
x = 42; // ReferenceError: x is not defined
```

**2. `this` is `undefined` in plain function calls (not `window`)**
```js
"use strict";
function f() { console.log(this); } // undefined, not window
```

**3. Duplicate parameter names are a syntax error**
```js
"use strict";
function sum(a, a) {} // SyntaxError
```

**4. Writing to read-only properties throws instead of silently failing**
```js
"use strict";
const obj = Object.freeze({ x: 1 });
obj.x = 2; // TypeError
```

**5. `delete` on variables/functions is a syntax error**
```js
"use strict";
var x = 1;
delete x; // SyntaxError
```

**6. Octal literals are forbidden**
```js
"use strict";
var n = 077; // SyntaxError
```

**7. Future reserved words (`let`, `static`, `yield`, etc.) are protected**

---

## Where to place it

- **Top of a file** — applies to the entire script
- **Top of a function body** — applies only to that function

```js
// Whole file
"use strict";
function foo() { ... }

// Or scoped to one function
function bar() {
    "use strict";
    ...
}
```

---

**Bottom line:** Write `"use strict"` at the top of any non-module JS file. For modern ES modules or TypeScript projects, your toolchain likely handles it automatically — but it never hurts to be explicit.