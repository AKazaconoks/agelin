<!-- before / electron-pro / so-1335851-use-strict / run 1 -->

**Duration**: 54.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## `"use strict"` in JavaScript

---

### What Is It and Where Did It Come From?

`"use strict"` is a **directive prologue** — a special string literal that, when placed at the top of a script or function body, instructs the JavaScript engine to execute that code in **strict mode**.

It was introduced in **ECMAScript 5 (ES5), released in December 2009**. Before ES5, JavaScript had accumulated a number of design quirks and silent failure modes. The TC39 committee faced a dilemma: fixing these issues outright would break the enormous amount of existing JavaScript on the web. The solution was opt-in.

The unusual syntax — a plain string literal rather than a keyword — was a deliberate backwards-compatibility trick. Older engines that didn't understand ES5 would simply evaluate the string as an expression and discard it harmlessly.

---

### Scope: Where to Place It

**File/script level** — first statement of a `.js` file:
```javascript
"use strict";

function doSomething() {
    // entire file is strict
}
```

**Function level** — first statement inside a function body:
```javascript
function doSomething() {
    "use strict";
    // only this function (and nested functions) are strict
}
```

**ES Modules and classes are always strict** — no directive needed.

---

### Browser Support

**Universal and complete.** All major browsers have supported it since ~2011 (Chrome 13, Firefox 4, Safari 5.1, IE10+, all Edge versions). There is no mainstream runtime in active use that does not support it.

---

### Is It Still Relevant Today?

**Yes, but context matters.**

- In **legacy scripts** (`<script>` tags, concatenated bundles, older codebases): still actively matters and used.
- In **modern module-based projects** (ES modules, TypeScript, Vite/webpack): often already enforced automatically. ES modules are inherently strict; TypeScript always emits strict-compatible output.
- **Linters** like JSLint and ESLint flag its absence in non-module scripts as a baseline hygiene requirement.

---

### Main Behavioural Changes

#### A. Silent failures become thrown errors

```javascript
"use strict";
x = 10; // ReferenceError — without strict mode: silently creates a global
```

```javascript
"use strict";
const obj = {};
Object.defineProperty(obj, "name", { value: "Alice", writable: false });
obj.name = "Bob"; // TypeError — without strict mode: silently ignored
```

```javascript
"use strict";
delete Object.prototype; // TypeError
var x = 1;
delete x;               // SyntaxError
```

#### B. Forbidden syntax

```javascript
"use strict";
function add(a, a) { }  // SyntaxError: duplicate parameter names
with (Math) { }          // SyntaxError: with statement forbidden
var n = 010;             // SyntaxError: legacy octal literal
```

#### C. `this` and scoping changes

**`this` is `undefined` in plain function calls** (not `window`/`global`) — arguably the most impactful change:
```javascript
"use strict";
function showThis() {
    console.log(this); // undefined
}
showThis();
// Without strict mode: logs window (in browsers)
```

**`eval` gets its own scope** — variables declared inside `eval` no longer leak out:
```javascript
"use strict";
eval("var secret = 42;");
console.log(secret); // ReferenceError — without strict mode: accessible here
```

**`arguments` doesn't track parameter mutations:**
```javascript
"use strict";
function test(a) {
    a = 99;
    console.log(arguments[0]); // still the original value, not 99
}
```

**Reserved words (`implements`, `interface`, `let`, `static`, `yield`, etc.) cannot be used as identifiers.**

---

### Summary

| Aspect | Detail |
|---|---|
| Introduced | ECMAScript 5 (2009) |
| Syntax | String literal as first statement |
| Scope | Whole file or individual function; ES Modules/classes always strict |
| Browser support | Universal — all engines since ~2011 |
| Still relevant | Yes, especially for non-module scripts and linters |
| Core benefit | Converts silent bugs into thrown errors, removes unsafe features, fixes `this` behaviour |

The JSLint warning is correct and reflects sound practice: for any script file that is not already an ES module, adding `"use strict"` at the top is a low-cost, high-value improvement that makes your code safer and easier to debug.