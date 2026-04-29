<!-- after / full-stack-developer / so-111102-javascript-closures / run 3 -->

**Duration**: 39.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the explanation the agent put together:

---

## What a closure IS

A closure is a function that **remembers the variables from the place where it was created**, even after that place has finished running.

The function carries its birthplace's variables with it, like luggage. Normally when a function finishes, its local variables disappear. A closure is what happens when an inner function holds on to those variables and keeps them alive.

---

## What a closure consists of

Two things, always together:

- **The function itself** — the inner function defined inside another function.
- **Its closed-over environment** — the specific variables from the outer scope that the inner function refers to.

You cannot have one without the other. Strip away either piece and you no longer have a closure — just a plain function.

---

## When JavaScript creates one

JavaScript creates a closure **every time a function is defined inside another function and the inner function references variables from the outer one.**

The moment the inner function is created, it quietly grabs a *live reference* to those outer variables — not a copy of their values, but a reference to the variables themselves. They will not be garbage-collected as long as the inner function exists.

```js
function makeGreeter(name) {
  function greet() {
    console.log("Hello, " + name);
  }
  return greet;
}

const greetAlice = makeGreeter("Alice");

// makeGreeter has finished running. Its stack frame is gone.
// But 'name' is still alive because greetAlice holds a reference to it.

greetAlice(); // "Hello, Alice"
```

`makeGreeter` has returned and is done. By all normal rules, `name` should be dead. But `greetAlice` is still holding it. That survival *is* the closure.

---

## Why a programmer would care

**Keeping state private.** Closures give you private variables without any `private` keyword:

```js
function makeCounter() {
  let count = 0; // nobody outside can touch this directly

  return {
    increment() { count += 1; },
    value()     { return count; }
  };
}

const counter = makeCounter();
counter.increment();
counter.increment();
console.log(counter.value()); // 2
// counter.count is undefined — there is no way in
```

**Remembering context in callbacks.** When you hand a function to `setTimeout` or an event listener, it often needs information from the surrounding code. Closures make that work with no extra wiring:

```js
function startTimer(username) {
  setTimeout(function () {
    console.log(username + " — your time is up!");
  }, 3000);
}
```

The callback runs three seconds after `startTimer` returns, and still knows `username`.

**Function factories.** Need several functions that differ by one configuration value?

```js
function makeMultiplier(factor) {
  return (number) => number * factor;
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

double(5); // 10
triple(5); // 15
```

Each returned function carries its own private `factor` — they do not share state.

---

## One-sentence mental model

A closure is what you get when a function packs up the variables it was born next to and carries them along for its entire lifetime — so it can use them whenever it is called, no matter where or when that happens.