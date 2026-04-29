<!-- after / bash-expert / so-1335851-use-strict / run 1 -->

**Duration**: 49.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a comprehensive breakdown of JavaScript's `"use strict"`:

---

## What is `"use strict"`?

It's a **directive** (not a statement) introduced in **ECMAScript 5 (2009)**. Because it's written as a string literal, older engines silently ignore it — making it fully backward-compatible.

Its goals: eliminate silent errors, help engines optimize, and prohibit syntax reserved for future versions.

---

## Key Behavioral Changes

### Variables
- Assigning to an **undeclared variable** throws `ReferenceError` (instead of creating an accidental global)
- `delete myVar` throws `SyntaxError`

### Functions
- **Duplicate parameter names** are forbidden: `function f(a, a) {}` → `SyntaxError`
- `arguments.callee` is forbidden
- `arguments` no longer mirrors parameter mutations

### `this` Binding
- In plain function calls, `this` is `undefined` instead of the global object — prevents accidental global pollution

### Objects
- Writing to a **non-writable**, **getter-only**, or **non-extensible** property throws `TypeError` instead of silently failing

### Syntax
- **`with` statement** is forbidden
- **Octal literals** (`077`) are forbidden (use `0o77`)
- `eval` gets its own scope — declared variables don't leak out
- Future reserved words (`let`, `static`, `yield`, etc.) are protected

---

## Scope: Where to Place It

| Placement | Effect |
|---|---|
| Top of file | Entire script runs in strict mode |
| Top of function body | Only that function is strict |
| ES module (import/export) | **Always strict automatically** — no declaration needed |
| Class body | **Always strict automatically** |

---

## Browser Support

Universal — supported since Chrome 13, Firefox 4, Safari 5.1, IE 10 (all circa 2011). Every current browser supports it fully.

---

## Is It Still Relevant?

**Yes**, though context matters:

- **ES modules & TypeScript**: strict mode is automatic — no directive needed
- **`<script>` tags, CommonJS/Node.js scripts**: still benefit from explicit `"use strict";`
- **All major style guides** (Airbnb, Google, Standard) require it for non-module code
- **JSLint/ESLint** flag its absence for good reason — the protections are real

The short answer: use it at the top of every `.js` file that isn't an ES module.