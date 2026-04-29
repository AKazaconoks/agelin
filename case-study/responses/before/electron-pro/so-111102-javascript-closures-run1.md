<!-- before / electron-pro / so-111102-javascript-closures / run 1 -->

**Duration**: 32.4s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+function\s+(returned|that\s+(uses|references|accesses))/i | output did not match /function\s+(returned\s+from|defined\s+inside|that\s+outlives)/i | output did not match /after\s+(the\s+)?outer\s+function\s+(has\s+)?(returned|finished|exited)/i

---
## JavaScript Closures

### What a closure IS

A closure is a function that **remembers the variables from the place where it was created**, even after that place has finished executing.

Normally you expect a function's local variables to vanish once the function returns. A closure breaks that expectation in a useful, controlled way: the inner function holds a live reference to those outer variables, keeping them alive as long as the inner function exists.

Plain-English definition: **a closure is a function bundled together with the surrounding variables it references.**

---

### What it consists of

Two parts — neither alone is a closure:

- **The function itself** — the inner function that does the work.
- **The captured environment** — the variables from the outer scope that the function references and holds onto.

---

### When JavaScript creates one

Automatically, every time an inner function references a variable from an outer function's scope. No keyword, no opt-in. It just happens.

```javascript
function makeCounter() {
  let count = 0;          // outer variable

  return function () {    // inner function — this IS the closure
    count += 1;
    return count;
  };
}

const counter = makeCounter();

console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

Walk-through:

1. `makeCounter` runs, creates local variable `count = 0`.
2. `makeCounter` returns the inner function, then **finishes** — normally `count` would be gone.
3. But the inner function still *references* `count`, so JavaScript keeps `count` alive, attached to that function.
4. Every call to `counter()` reads and updates the *same* `count` — not a fresh copy.

Call `makeCounter()` a second time and you get a completely independent counter with its own private `count`. The two do not share state.

---

### Why a programmer would care

- **Private state without a class.** `count` above is genuinely private — no outside code can read or reset it directly. Encapsulation with very little ceremony.
- **Factory functions.** Stamp out multiple independent instances (multiple counters, validators, handlers) each with their own isolated state.
- **Callbacks that remember context.** When you hand a function to `setTimeout`, an event listener, or a `fetch` callback, it typically needs variables from the surrounding code. Closures make that work automatically, without passing everything in as an argument.
- **Partial application.** Take some configuration up front, return a ready-to-use function — common in utility libraries and application code alike.

---

### The mental model to hold onto

Think of an outer function as a **room with variables in it**. When an inner function is created inside that room, it receives a **permanent keycard** to that room. Even after the outer function returns and the room is no longer being built, the inner function can always walk back in and read or update what is there.

That keycard-plus-function is the closure.