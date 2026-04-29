<!-- after / bash-expert / so-111102-javascript-closures / run 3 -->

**Duration**: 24.3s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /lexical\s+(scope|environment|context)/i | output did not match /enclosing\s+(scope|function|environment)/i | output did not match /(captures?|closes\s+over|remembers)\s+(the\s+)?(variables?|environment|scope)/i

---
A **closure** is a function that "remembers" variables from the scope where it was *defined*, even after that scope has finished executing.

---

## What it consists of

A closure is two things bundled together:

1. **The function itself**
2. **A live reference to the variables that were in scope when the function was defined** — not a copy of their values, but a connection to the actual memory locations

---

## When JavaScript creates one

Automatically, whenever an inner function references variables from an outer function:

```javascript
function createCounter() {
    let count = 0;         // outer variable

    return function() {    // inner function — closes over 'count'
        count++;
        return count;
    };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

`createCounter()` returns and is "done" — but `count` is not garbage-collected, because the returned function still holds a reference to it. That live bundle of {function + count} is the closure.

---

## The key distinction

A closure holds a **live reference**, not a frozen value. If the outer variable changes, the closure sees the new value. If the closure changes it, the outer scope (or another closure over the same variable) sees that too.

---

## Why a programmer cares

| Pattern | What the closure does |
|---|---|
| **Private state** | Hides a variable so only the returned function can touch it |
| **Factory functions** | Each call to the outer function produces an independent closure with its own copy of the variable |
| **Event handlers / callbacks** | The callback "remembers" the context from when it was wired up, not from when it fires |

The counter above is the canonical example of private state: nothing outside `createCounter` can read or write `count` directly — only the returned function can. That's a closure acting as a lightweight object with one private field.