<!-- before / full-stack-developer / so-111102-javascript-closures / run 2 -->

**Duration**: 36.7s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+function\s+(returned|that\s+(uses|references|accesses))/i | output did not match /function\s+(returned\s+from|defined\s+inside|that\s+outlives)/i | output did not match /after\s+(the\s+)?outer\s+function\s+(has\s+)?(returned|finished|exited)/i

---
Here is the explanation from the agent:

---

## What a closure IS

A closure is a function that **remembers the variables from the place where it was defined**, even after that place has finished executing.

When a function is created inside another function, the inner function permanently holds a **live reference** to the outer function's variables. Those variables do not disappear when the outer function returns. The inner function carries them with it, wherever it goes.

---

## What it consists of

A closure has two parts:

- **The function itself** — the inner function that will be called later.
- **The captured environment** — the outer variables the inner function references. Not a snapshot copy, but a live link to the actual variables.

That live link is what separates a closure from a plain function.

---

## When JavaScript creates one

The rule: **a closure is created whenever a function is defined inside another function and references that outer function's variables.**

JavaScript does this automatically — no special syntax, no opt-in. The moment the inner function is defined, it captures the surrounding scope.

---

## Why a programmer would care

The practical payoff is **persistent, private state**.

Normally, when a function finishes, its local variables vanish. A closure keeps a variable alive and accessible — but only through the function that captured it. Nothing else in your program can touch it directly. Controlled, self-contained state without needing a class or a global.

---

## Short example

```javascript
function makeCounter() {
  let count = 0;

  function increment() {
    count += 1;
    return count;
  }

  return increment;
}

const counter = makeCounter();

console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

Walk-through:

1. `makeCounter` runs, creates `count = 0`, then defines `increment` — which reaches out and references `count`. **Closure formed.**
2. `makeCounter` returns `increment` and finishes. By normal rules, `count` should be destroyed.
3. It is not, because `increment` still holds a live reference. JavaScript keeps `count` alive as long as `increment` exists.
4. Every `counter()` call updates the *same* `count` variable across calls.

Separate instances stay separate:

```javascript
const counterA = makeCounter();
const counterB = makeCounter();

counterA(); // 1
counterA(); // 2
counterB(); // 1 — its own independent count
```

Each call to `makeCounter` produces a fresh `count` and a fresh `increment` that captured it. The two closures do not share state.

---

**One-sentence summary:** A closure is what JavaScript quietly creates when an inner function grabs hold of an outer variable — bundling that variable and the function together, keeping the variable alive and private for as long as the function exists.