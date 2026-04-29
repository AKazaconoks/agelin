<!-- after / electron-pro / so-111102-javascript-closures / run 3 -->

**Duration**: 26.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+function\s+(returned|that\s+(uses|references|accesses))/i | output did not match /function\s+(returned\s+from|defined\s+inside|that\s+outlives)/i | output did not match /after\s+(the\s+)?outer\s+function\s+(has\s+)?(returned|finished|exited)/i

---
Here is the explanation from the agent:

---

## JavaScript Closures

### 1. What a closure IS

A closure is a function that **remembers the variables from the place where it was created**, even after that place has finished executing.

When a function is done running, you normally expect its local variables to disappear. A closure is what happens when an inner function holds on to those variables, keeping them alive.

Plain-English definition: **a closure is a function bundled together with the variables it was born into.**

---

### 2. What it consists of

A closure has two parts:

- **The function itself** — the code that runs when you call it.
- **Its captured environment** — the surrounding variables that the function references. Not a copy of their values at creation time, but a **live reference** to the variables themselves.

That second part is what makes it a closure and not just a plain function.

---

### 3. When JavaScript creates one

JavaScript creates a closure **every time a function is defined inside another function and references a variable from the outer function.**

```js
function makeCounter() {
  let count = 0;          // outer variable

  return function () {    // inner function — this is the closure
    count += 1;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

`makeCounter` finishes running after the `return`, so you might expect `count` to be gone. It is not — the returned function still references it, so JavaScript keeps `count` alive as long as that inner function exists.

---

### 4. Why a programmer would care

**Private state.** The `count` variable above is completely inaccessible from outside. No other code can read or reset it directly. Closures give you encapsulation without needing a class.

**Factory functions.** Calling `makeCounter()` multiple times produces independent counters — each call gets its own `count`. The closures do not share state with each other.

**Callbacks and async code.** When you pass a callback to `setTimeout`, an event listener, or a `fetch` call, that callback almost always closes over variables from its surrounding context. Closures are why those callbacks can still see the right data when they eventually run, long after the surrounding function has returned.

**The practical summary:** closures let a function carry its context with it. Instead of relying on global variables or passing everything as arguments, a function can simply remember what it needs from where it was born.