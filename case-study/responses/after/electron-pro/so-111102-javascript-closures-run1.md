<!-- after / electron-pro / so-111102-javascript-closures / run 1 -->

**Duration**: 36.9s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+function\s+(returned|that\s+(uses|references|accesses))/i | output did not match /function\s+(returned\s+from|defined\s+inside|that\s+outlives)/i | output did not match /after\s+(the\s+)?outer\s+function\s+(has\s+)?(returned|finished|exited)/i

---
Here is the explanation:

---

## JavaScript Closures

### What a closure IS

A closure is a **function that remembers the variables from the place where it was defined**, even after that place has finished executing.

The function carries a backpack of variables with it wherever it goes.

---

### What it consists of

A closure has two parts:

1. **The function itself** — ordinary, callable code.
2. **A captured environment** — a reference to the variables that were in scope when the function was defined, held alive even if the surrounding code has long since returned.

The key word is *reference*, not *copy*. The closure doesn't snapshot the value at creation time — it holds a live link to the variable. If the variable changes, the closure sees the change.

---

### When JavaScript creates one

Every time a function is defined inside another function (or any block with its own variables), JavaScript **automatically** creates a closure. You don't opt in — it is the default behavior.

```js
function makeCounter() {
  let count = 0;          // lives in makeCounter's scope

  return function () {    // this inner function is the closure
    count += 1;
    return count;
  };
}

const counter = makeCounter();  // makeCounter has finished running

console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

Step through what happens:

- `makeCounter` runs and then *returns*. Normally you'd expect `count` to be gone.
- But the inner function still holds a reference to `count` in its backpack.
- JavaScript keeps `count` alive in memory because something still needs it.
- Each call to `counter()` reads and updates the *same* `count`, persisting across calls.

---

### Why a programmer would care

**1. Private state without a class.**
Nothing outside `makeCounter` can read or modify `count` directly. You get encapsulation with zero class syntax.

**2. Factory functions.**
Call `makeCounter()` twice and you get two independent counters, each with their own `count`:

```js
const a = makeCounter();
const b = makeCounter();

a(); // 1
a(); // 2
b(); // 1  — completely independent
```

**3. Callbacks and event handlers that need context.**
This is where closures matter most day-to-day. When you pass a callback to `setTimeout`, `addEventListener`, or a fetch `.then()`, that callback often needs variables from the surrounding code:

```js
function showMessageAfterDelay(message, delayMs) {
  setTimeout(function () {
    console.log(message); // message is closed over — still accessible
  }, delayMs);
}
```

`showMessageAfterDelay` has already returned by the time the timeout fires. Without closures, `message` would be gone. Closures are why it works.

---

### The one sharp edge worth knowing now

Because closures hold a *reference* (not a copy), a common mistake is closing over a loop variable:

```js
// Broken — all callbacks share the same reference to i
for (var i = 0; i < 3; i++) {
  setTimeout(function () { console.log(i); }, 100);
}
// prints: 3, 3, 3

// Fixed — let creates a new binding per iteration
for (let i = 0; i < 3; i++) {
  setTimeout(function () { console.log(i); }, 100);
}
// prints: 0, 1, 2
```

`var` gives you one `i` shared across the whole loop. `let` gives you a fresh `i` per iteration, so each closure captures a different binding. This is the most common closure-related bug in real JavaScript.

---

### Summary

| | |
|---|---|
| **What** | A function bundled with the variables it had access to when defined |
| **Parts** | The function + a live reference to its surrounding variables |
| **When** | Automatically, whenever a function is defined inside another scope |
| **Why** | Private state, factory functions, callbacks that need context |