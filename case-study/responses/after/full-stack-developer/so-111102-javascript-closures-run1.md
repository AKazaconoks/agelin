<!-- after / full-stack-developer / so-111102-javascript-closures / run 1 -->

**Duration**: 34.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+function\s+(returned|that\s+(uses|references|accesses))/i | output did not match /function\s+(returned\s+from|defined\s+inside|that\s+outlives)/i | output did not match /after\s+(the\s+)?outer\s+function\s+(has\s+)?(returned|finished|exited)/i

---
Here is the explanation the agent produced:

---

## What a closure is

A closure is a function that **remembers the variables from the place where it was defined**, even after that place has finished executing.

That last part is the key. Normally you might expect that when a function finishes running, its local variables are gone. A closure is what happens when an inner function holds on to those variables and keeps them alive.

---

## What it consists of

A closure has two parts:

1. **The inner function itself** — the one that gets returned or passed around.
2. **Its captured environment** — the specific variables from the outer scope that the inner function references.

These two things travel together as a unit. The inner function is useless without its remembered variables, and the variables are only kept alive because the inner function holds a reference to them.

---

## When JavaScript creates one

JavaScript creates a closure every time a function is defined inside another function and the inner function references variables from the outer one. This happens **automatically** — you do not ask for it.

```javascript
function makeCounter() {
  let count = 0;          // outer variable

  return function () {    // inner function — a closure
    count += 1;
    return count;
  };
}

const counter = makeCounter();

console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

Walk through what happens:

- `makeCounter` runs, creates `count`, and returns the inner function.
- `makeCounter` then finishes. Normally `count` would be discarded.
- But `counter` still holds a reference to the inner function, which still references `count`.
- So `count` is kept alive inside the closure.
- Each call to `counter()` reads and updates the **same** `count` — the one captured when the closure was formed.

Call `makeCounter()` a second time and you get a brand-new closure with its own separate `count`. The two counters do not interfere with each other.

---

## Why a programmer would care

**1. Private state without a class.**
Nothing outside the closure can touch `count` directly. There is no way to reset it or read it except through the function you were given. This is the simplest form of data encapsulation in JavaScript — no classes, no `private` keyword needed.

**2. Functions configured once, called many times.**

```javascript
function makeMultiplier(factor) {
  return function (number) {
    return number * factor;
  };
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

console.log(double(5));  // 10
console.log(triple(5)); // 15
```

`factor` is baked into each returned function at creation time. You call `makeMultiplier` once per configuration, not once per calculation.

**3. Callbacks and event handlers that need context.**
In real applications — click handlers, timers, network responses — a function often needs to remember something about the situation it was set up in. Closures are how that context travels with the function automatically, without passing it as an argument every time it fires.

---

## The mental model to keep

Think of a closure as a **function with a backpack**. When the inner function is created, it looks at the variables it uses and puts references to them in its backpack. From that point on, wherever the function goes, the backpack goes with it. The outer scope can finish and be cleaned up, but anything in the backpack stays alive as long as the function does.