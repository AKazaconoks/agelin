<!-- before / bash-expert / so-111102-javascript-closures / run 2 -->

**Duration**: 29.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the explanation from the agent:

---

## What a closure IS

A closure is a function that **remembers variables from the place where it was created**, even after that place has finished executing. Think of it as a function with a personal memory box that travels with it wherever it goes.

---

## What it consists of

A closure has two parts:

1. **The function itself** — the code that runs
2. **The captured environment** — the variables that existed in the outer scope when the function was defined

---

## When JavaScript creates one

Automatically, whenever:
- A function is defined inside another function, **and**
- the inner function references variables from the outer function

JavaScript packages up the inner function together with those outer variables. You don't opt in — it just happens.

---

## A concrete example

```javascript
function makeCounter() {
    let count = 0;       // lives in makeCounter's scope

    return function() {
        count++;         // inner function "closes over" count
        return count;
    };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

Step by step:
1. `makeCounter()` runs and creates `count`.
2. It returns an inner function that references `count`.
3. `makeCounter()` finishes — normally `count` would vanish.
4. But because the returned function still holds a reference to it, `count` **survives**.
5. Every call to `counter()` reads and updates the *same* `count`.

The closure is the returned function **plus** its memory of `count`.

---

## Why a programmer would care

- **Private state** — `count` above is inaccessible from outside; only the closure can touch it. This is the simplest form of encapsulation without a class.
- **Factory functions** — call `makeCounter()` twice and you get two independent counters, each with their own `count`. Same code, isolated state.
- **Event handlers and callbacks** — when you attach a click handler inside a loop or a setup function, the handler needs to remember which item it belongs to. Closures make that automatic.

The key mental shift: a function does not just carry its code — it also carries a reference to the variables that were in scope where it was **written**, not where it is **called**.