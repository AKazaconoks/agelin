<!-- after / bash-expert / so-111102-javascript-closures / run 2 -->

**Duration**: 30.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the explanation from the agent:

---

## What a closure IS

A closure is a function that "remembers" variables from the place where it was created, even after that place has finished executing. Think of it like a function with a personal, persistent memory of its birthplace.

## What it consists of

A closure has two parts:
1. **The function itself** — the actual code to execute
2. **Its lexical environment** — all the variables that were accessible when the function was defined

## When JavaScript creates one

JavaScript creates a closure every time you define a function inside another function (or block). The inner function automatically carries access to the outer function's variables — and that access persists even after the outer function has returned and is "done."

```javascript
function makeCounter() {
    let count = 0;  // lives in makeCounter's scope

    return function() {
        count++;    // the inner function "closes over" count
        return count;
    };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

`makeCounter()` finished executing, but the returned function still remembers and can modify `count`. That surviving link is the closure.

## Why a programmer would care

1. **Private variables.** `count` above is invisible to the outside world — no external code can reach in and corrupt it. Only the returned function can touch it.

2. **Function factories.** You can stamp out customized functions on demand, each with their own independent state:

```javascript
function makeMultiplier(factor) {
    return function(number) {
        return number * factor;
    };
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

double(5); // 10
triple(5); // 15
```

`double` and `triple` each close over their own separate `factor`. They share code but not data.

3. **Callbacks that remember context.** When you hand a function to `setTimeout`, an event listener, or a Promise, it does not lose track of where it came from — it brings its captured environment with it.

---

**The central idea:** a function in JavaScript is not just code. It is code *plus* the environment where it was born. That bundle — code and captured variables together — is a closure. You get one automatically whenever an inner function is defined; you just do not always notice it until the outer scope disappears and the inner function is still working fine.