<!-- before / full-stack-developer / so-1335851-use-strict / run 3 -->

**Duration**: 84.6s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 84.57s > 60s

---
## JavaScript `"use strict"` — A Complete Explanation

---

### What It Is

`"use strict"` is a **directive** (not a statement) that enables ECMAScript's *strict mode* — a restricted, safer variant of JavaScript. It was introduced in **ECMAScript 5 (December 2009)** as an opt-in escape hatch to fix badly designed language behaviors without breaking the existing web.

The string literal approach was chosen specifically for backward compatibility: older engines just evaluate the string and discard it harmlessly.

---

### How to Use It

**File/script level** — must be the very first line:
```javascript
"use strict";

// Entire file runs in strict mode
```

**Function level** — applies only to that function and its inner functions:
```javascript
function strictFunction() {
    "use strict";
    // Only this function is strict
}
```

**ES Modules & Classes (modern JS)** — automatically strict, no directive needed:
```javascript
import { foo } from './foo.js'; // Already strict mode
```

---

### Key Behavioral Changes

| Behavior | Sloppy Mode | Strict Mode |
|---|---|---|
| Undeclared variable assignment | Creates global silently | `ReferenceError` |
| `this` in plain function call | Global object (`window`) | `undefined` |
| Duplicate parameter names | Allowed | `SyntaxError` |
| `with` statement | Allowed | `SyntaxError` |
| Write to read-only property | Silent no-op | `TypeError` |
| Delete a variable/function | Silent no-op | `SyntaxError` |
| Octal literal (`0777`) | Interpreted as octal | `SyntaxError` |
| `eval` variable leakage | Leaks into outer scope | Contained in eval scope |
| `arguments` / param linking | Live-linked | Static snapshot |
| Future reserved words as identifiers | Allowed | `SyntaxError` |

---

### The Most Impactful Changes

**1. No accidental globals:**
```javascript
"use strict";
result = 100; // ReferenceError: result is not defined
```

**2. `this` is `undefined` in plain calls (prevents accidental global mutation):**
```javascript
function Person(name) {
    "use strict";
    this.name = name;
}
Person("Alice"); // TypeError — not silently polluting window
```

**3. Silent failures become explicit `TypeError`s:**
```javascript
"use strict";
const obj = Object.freeze({});
obj.newProp = "hello"; // TypeError instead of silent failure
```

---

### Browser Support

Full support since ~2011 in all major browsers (Chrome 13+, Firefox 4+, Safari 5.1+, IE10+). It's been universally supported for over a decade.

---

### Is It Still Relevant Today?

**Yes, but context matters:**

- **ES Modules** (`import`/`export`) and **class bodies** are automatically strict — no directive needed.
- **CommonJS** (Node.js `require`/`module.exports`) and plain `<script>` tags are **not** automatically strict — you still need the directive.
- **TypeScript** projects effectively enforce strict semantics at compile time.

For your JSLint error specifically: add `"use strict";` as the absolute first line of your file. JSLint (created by Douglas Crockford, a strong advocate for strict mode) enforces it as a hard requirement because it eliminates entire bug categories that JSLint would otherwise need to warn about individually.