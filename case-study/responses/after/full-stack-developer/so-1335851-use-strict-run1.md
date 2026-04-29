<!-- after / full-stack-developer / so-1335851-use-strict / run 1 -->

**Duration**: 80.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 80.47s > 60s

---
Here is a comprehensive explanation of `"use strict"`:

---

## What Is `"use strict"`?

`"use strict"` is a **directive prologue** — a string literal placed at the very beginning of a script or function body that tells the JavaScript engine to run that code in **strict mode**. It has no runtime value itself; it is purely a signal to the parser.

```js
"use strict"; // entire script runs in strict mode

// OR scoped to just one function:
function safe() {
    "use strict";
    // strict mode applies here only
}
```

---

## Historical Background

JavaScript was famously designed in 10 days in 1995. Several design mistakes made it in — silent failures, accidental globals, ambiguous `this` — but removing them later would break the enormous amount of existing JS already on the web.

**ECMAScript 5 (December 2009)** introduced strict mode as an *opt-in* mechanism. The string literal approach was deliberate and backwards-compatible: older engines simply evaluate `"use strict"` as a harmless no-op expression. ES5-aware engines treat it as a real directive.

**ES6/ES2015 and later** made strict mode the *implicit default* for:
- **ES Modules** (`import`/`export`) — always strict, no directive needed
- **Class bodies** — always strict automatically

---

## Browser Support

Universally supported since ~2011. All modern browsers, Node.js, and every realistic deployment target support it fully. IE 10+ supports it; IE 9 had partial support.

---

## Scope: Script-level vs. Function-level

| Placement | Effect |
|---|---|
| Top of a `.js` file | Entire script runs in strict mode |
| Top of a function body | Only that function (and nested ones) run in strict mode |
| ES Module / class body | Always strict — no directive needed |

Function-level scoping was especially useful during migration: tighten up new code without risking breakage in existing legacy code.

---

## Main Behavioral Changes

### 1. No Accidental Global Variables
```js
"use strict";
name = "Alice"; // ReferenceError — was silently creating window.name before
```

### 2. Silent Assignment Failures Become Errors
Assigning to a non-writable property, a getter-only property, or a property of a non-extensible object now throws `TypeError` instead of silently doing nothing.

### 3. Duplicate Parameter Names Banned
```js
"use strict";
function add(a, a) { } // SyntaxError — caught at parse time
```

### 4. `with` Statement Banned
```js
"use strict";
with (obj) { } // SyntaxError — was always harmful, now disallowed
```

### 5. `this` is `undefined` in Plain Function Calls
```js
"use strict";
function whoAmI() {
    console.log(this); // undefined — was window/global in sloppy mode
}
whoAmI();
```

### 6. `eval` Has Its Own Isolated Scope
Variables declared inside `eval` no longer leak into the surrounding scope.

### 7. `eval` and `arguments` Cannot Be Redefined
```js
"use strict";
var eval = 5; // SyntaxError
```

### 8. `arguments` Is a Snapshot (Not Live-Linked)
Changing a named parameter no longer updates `arguments[n]` and vice versa.

### 9. `arguments.callee` Is Forbidden
Throws `TypeError`. Use named function expressions for self-reference instead.

### 10. Octal Literals Banned
```js
"use strict";
var n = 0755; // SyntaxError — use 0o755 instead (explicit ES6 octal)
```

### 11. Deleting Undeletable Properties Throws
```js
"use strict";
delete Object.prototype; // TypeError — was silently ignored before
```

### 12. Future Reserved Words Locked Down
`implements`, `interface`, `let`, `package`, `private`, `protected`, `public`, `static`, `yield` cannot be used as identifiers.

---

## Is It Still Relevant?

**Yes — though context matters:**

- Writing plain `.js` script files? Put `"use strict";` at the top of every file.
- Using ES modules (`import`/`export`)? Already strict — no directive needed.
- Using classes? Already strict — no directive needed.
- Working in a legacy codebase? Use function-level opt-in for new code.

JSLint flags its absence because strict mode turns silent bugs into loud, early errors — at parse time or on first execution — rather than letting them silently corrupt program state at runtime.