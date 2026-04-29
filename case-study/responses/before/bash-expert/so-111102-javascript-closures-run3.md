<!-- before / bash-expert / so-111102-javascript-closures / run 3 -->

**Duration**: 26.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the explanation from the agent:

---

## What a closure IS

A closure is a function that **remembers variables from the place where it was created**, even after that place has finished executing. Think of it as a function bundled with its own personal memory of the surrounding context.

---

## What it consists of

A closure has two parts:

1. **The function itself** — the code that runs
2. **A captured environment** — the variables that were in scope when the function was *defined*

---

## When JavaScript creates one

Automatically — any time you define a function inside another function. The inner function gets access to the outer function's variables, and it *keeps* that access even after the outer function has returned and is otherwise gone.

---

## Why a programmer would care

Closures let you:
- Create functions with **private, persistent state** (without a class)
- Write **factory functions** that stamp out customized variants
- Give event handlers and callbacks access to local variables from the surrounding code

---

## Short example

```javascript
function makeCounter() {
    let count = 0;

    return function () {
        count++;
        return count;
    };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3

const counter2 = makeCounter();
console.log(counter2()); // 1  ← its own separate count
```

`makeCounter` runs and finishes, but the returned function still has a **live reference** to `count` — not a copy of its value at the time, but the actual variable. Each call to `makeCounter()` produces a fresh closure with its own independent `count`.

---

**The one-sentence mental model:** a closure is a function that carries its birthplace's variables with it, keeping them alive as long as the function itself is alive.