<!-- before / electron-pro / so-1335851-use-strict / run 2 -->

**Duration**: 94.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 94.55s > 60s

---
Here is a comprehensive explanation of `"use strict"` in JavaScript:

---

## What Is `"use strict"`?

`"use strict"` is a **directive prologue** — a special string literal that tells the JavaScript engine to run your code in "strict mode." It's not a real statement; the engine detects it as an opt-in signal.

### History

JavaScript was designed hastily in 1995, accumulating dangerous permissive behaviors that couldn't simply be removed without breaking existing sites. The solution came with **ECMAScript 5 (December 2009)**: an opt-in "strict mode" that fixes the language for new code without touching old code. Old browsers that didn't understand it would simply evaluate `"use strict"` as a harmless no-op string expression.

---

## How to Enable It

**File/script level** — first statement in the file:
```javascript
"use strict";
// Everything here is strict
```

**Function level** — first statement inside a function:
```javascript
function strictFn() {
    "use strict";
    // Only this function is strict
}
```

> Any real statement before the directive silently disables it.

---

## Main Behavioral Changes

| Change | Sloppy Mode | Strict Mode |
|---|---|---|
| Undeclared variable assignment | Creates global silently | `ReferenceError` |
| Writing to read-only property | Silent failure | `TypeError` |
| Deleting undeletable property | Silent `false` | `TypeError` |
| Duplicate parameter names | Allowed | `SyntaxError` |
| `this` in unbound function calls | Global object (`window`) | `undefined` |
| `with` statement | Allowed | `SyntaxError` |
| `eval` leaking variables | Leaks into surrounding scope | Sandboxed |
| Octal literals (`010`) | Allowed | `SyntaxError` |
| `arguments.callee` | Allowed | `TypeError` |

The `this` change is particularly impactful — it prevents accidental global pollution when functions are called without a receiver.

---

## Browser Support

Universally supported everywhere since ~2011–2012 (Chrome 13, Firefox 4, Safari 5.1, IE 10, Node.js v0.10). As of 2026, there is no mainstream environment where it's missing.

---

## Is It Still Relevant?

Yes, but **you rarely need to write it manually in modern code**:

- **ES Modules** (`import`/`export`) are **always strict automatically** — no directive needed
- **Class bodies** are **always strict automatically**
- **TypeScript** with `"alwaysStrict": true` (included in `"strict": true`) emits it for you

**You still need it explicitly for:**
- Classic `<script>` tags (non-module scripts)
- CommonJS Node.js files (`.js` with `require`/`module.exports`)

---

## Key Gotchas

1. **File concatenation**: Script-level strict mode affects the entire concatenated bundle — use function-level or a module bundler to avoid this.
2. **`this` in callbacks**: `setTimeout(obj.method, 1000)` will have `this === undefined` in strict mode — use `.bind()` or arrow functions.
3. **Node.js asymmetry**: `.js` (CJS) files are NOT strict by default; `.mjs` files are.
4. **JSLint is dated**: Consider migrating to ESLint or Biome, which understand ES modules and modern contexts where strict mode is already implicit.

---

**Bottom line**: `"use strict"` was a brilliant backward-compatible fix for ES5. Today it's baked into the language itself via ES modules and classes, so you encounter it less as a directive you write and more as an ambient property of modern JavaScript.