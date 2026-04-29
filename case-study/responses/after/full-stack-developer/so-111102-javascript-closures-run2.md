<!-- after / full-stack-developer / so-111102-javascript-closures / run 2 -->

**Duration**: 43.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough but grounded explanation of closures:

---

## What a closure is

When a function is defined inside another function, the inner function **remembers the variables from the outer function** — even after the outer function has finished running.

That memory *is* the closure. It is not a special thing you build; JavaScript creates it automatically whenever a function uses a variable from the surrounding scope where it was defined.

A useful mental model: a closure is **a function with a backpack**. The backpack holds references to every variable the function could see when it was created. Wherever the function goes later, the backpack travels with it.

---

## What it consists of

A closure has exactly two parts:

1. **The function itself** — the inner function you define.
2. **The captured environment** — the variable bindings from the outer scope that the function references.

One important subtlety: the backpack holds **live references**, not a snapshot. If the outer variable changes later, the closure sees the updated value.

---

## When JavaScript creates one

Every time an inner function references a variable from an outer scope — automatically, without you opting in. This happens when you:

- Return a function from another function
- Pass a callback that uses variables from the surrounding code
- Attach an event listener inside a setup function

The engine keeps those outer variables alive in memory as long as the inner function is reachable.

---

## A grounded example

```js
function makeCounter() {
  let count = 0;          // lives in makeCounter's scope

  return function increment() {
    count += 1;           // reaches into makeCounter's scope
    return count;
  };
}

const counter = makeCounter();  // makeCounter is done running...
console.log(counter());         // 1  ...but count is still alive
console.log(counter());         // 2
console.log(counter());         // 3

const otherCounter = makeCounter(); // fresh call, fresh count
console.log(otherCounter());        // 1  (independent)
```

What happens step by step:

1. `makeCounter` runs, creates local `count`.
2. It returns `increment` and finishes — normally `count` would be garbage collected.
3. But `increment` still references `count`, so the engine keeps it alive, attached to that function.
4. Each call to `counter()` reads and updates that same `count`.
5. `otherCounter` gets its own separate `count` from a separate call to `makeCounter`.

---

## Why you would care

**Private state.** `count` above is unreachable from outside — you can only call `increment`. Before private class fields, closures were the standard way to hide data in JavaScript.

**Factory functions.** Call the outer function multiple times with different arguments; each returned function carries its own version.

```js
function makeMultiplier(factor) {
  return (n) => n * factor;
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

double(5); // 10
triple(5); // 15
```

**Callbacks that remember context.** Event handlers and `setTimeout` callbacks often need a user ID, a form value, or a DOM reference from the surrounding code. Closures make that work without passing everything as an argument every time.

**The module pattern.** Before ES modules, the standard way to build self-contained units with public/private parts was to return an object of functions from an immediately-called outer function — every method shared the same closed-over private variables.

---

## The one thing to watch out for

Closures hold **live references**, not copies. The classic pitfall: creating closures in a loop where each one is supposed to remember a different iteration value, but they all share the same variable and see only its final value. Using `let` instead of `var` in the loop fixes this in modern JavaScript, because `let` gives each iteration its own binding.

---

## One-sentence summary

A closure is what you have when a function **remembers the variables from the scope where it was written**, even after that scope has finished executing — and JavaScript creates one automatically any time an inner function reaches into an outer scope.