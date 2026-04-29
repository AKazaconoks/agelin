<!-- before / full-stack-developer / so-111102-javascript-closures / run 3 -->

**Duration**: 34.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the explanation from the agent:

---

## What a closure IS

A closure is a function that **remembers the variables from the place where it was created**, even after that place has finished running.

The function carries a backpack with it — and in that backpack are the variables it had access to when it was born. It can keep using them long after the original code that created them is gone.

---

## What it consists of

A closure has exactly two parts:

1. **An inner function** — the one doing the remembering
2. **Variables from an outer scope** — the things packed in its backpack

Neither part alone is a closure. It is the *combination* — a function that reaches out and holds onto variables from somewhere outside itself.

---

## When JavaScript creates one

JavaScript creates a closure **every time a function is defined inside another function** (or inside any scope that has local variables). You do not have to do anything special — defining the inner function is enough.

```javascript
function makeCounter() {
  let count = 0;           // lives in the outer function

  return function () {     // this inner function is the closure
    count++;               // reaches into the backpack for `count`
    return count;
  };
}

const counter = makeCounter();  // makeCounter() has finished running...

console.log(counter()); // 1   // ...but count is still alive
console.log(counter()); // 2
console.log(counter()); // 3
```

`makeCounter` ran and returned. Normally everything inside it would be cleaned up. But because the inner function still holds a reference to `count`, JavaScript keeps it alive. The closure is the reason it survives.

---

## Why a programmer would care

**Private state.** `count` above cannot be touched from outside. The only way to interact with it is through the returned function. Closures give you encapsulation without a class.

**Pre-configured functions.** You can bake specific values into a function at creation time:

```javascript
function makeMultiplier(factor) {
  return (number) => number * factor;  // `factor` is closed over
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

double(5); // 10
triple(5); // 15
```

`double` and `triple` are separate functions, each carrying their own `factor`. This is the *factory function* pattern, one of the most common places closures appear in real code.

**Callbacks and event handlers.** When you write a click handler, a `setTimeout`, or a `fetch` callback, the function you pass often needs to remember data from surrounding code. It can do that *because* it is a closure.

---

**One-sentence summary:** A closure is what lets an inner function remember and use variables from its outer function, even after the outer function has finished — giving you private, persistent state without any extra machinery.