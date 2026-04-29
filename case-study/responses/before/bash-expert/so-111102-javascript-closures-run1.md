<!-- before / bash-expert / so-111102-javascript-closures / run 1 -->

**Duration**: 31.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+function\s+(returned|that\s+(uses|references|accesses))/i | output did not match /function\s+(returned\s+from|defined\s+inside|that\s+outlives)/i | output did not match /after\s+(the\s+)?outer\s+function\s+(has\s+)?(returned|finished|exited)/i

---
Here is what the agent produced — I've kept the structure as-is because it's clear:

---

## What a closure IS

A closure is a function that **remembers variables from the place where it was created**, even after that place has finished running. Think of it like a function carrying a backpack containing the variables it needs from its birthplace.

---

## What it consists of

Two parts:
- **The function itself** — the code that does something
- **The captured environment** — the outer variables that the function holds onto

---

## When JavaScript creates one

Automatically, whenever an inner function references a variable from an outer scope. There is no special keyword — if a function reaches outside itself to read or write a variable, JavaScript preserves that variable for it.

---

## Why you would care

- **Data privacy** — a variable that nothing else can touch or overwrite directly
- **Function factories** — produce customized functions on demand
- **Event handlers / callbacks** — the handler needs to "remember" context from when it was set up, not just from when it fires

---

## Short example

```javascript
function createCounter() {
    let count = 0;          // lives in createCounter's scope

    return function() {
        count++;            // the returned function remembers count
        return count;
    };
}

const myCounter = createCounter();
myCounter(); // 1
myCounter(); // 2
myCounter(); // 3

const other = createCounter();
other();     // 1 — its own separate count
```

`createCounter` finishes executing, yet `count` is not destroyed. The returned function still has a live reference to it. That combination — **the inner function + the surviving variable** — is the closure.

Each call to `createCounter()` produces a fresh closure with its own independent `count`, which is why `other` starts back at 1. The variable is effectively private: nothing outside the returned function can read or change `count` directly.