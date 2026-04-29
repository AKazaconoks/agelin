<!-- after / electron-pro / so-111102-javascript-closures / run 2 -->

**Duration**: 33.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the explanation the agent produced:

---

## What a closure IS

When a function is created inside another function, the inner function **remembers the variables from the outer function — even after the outer function has finished running**.

That memory is a closure. It is not special syntax and not something you opt into. Think of it like a backpack: when the inner function is created, JavaScript packs up the variables it can see and attaches them to the function. The function carries that backpack wherever it goes.

---

## What it consists of (two parts)

1. **The function itself** — the inner function that gets returned or passed around.
2. **The captured environment** — the variables from the outer scope that the function holds a live reference to. Not a snapshot — if the variable changes, the function sees the change.

---

## When JavaScript creates one

Every time a function is defined inside another function and references a variable from the outer scope, JavaScript creates a closure automatically. You do not ask for it.

```js
function makeGreeter(name) {
  function greet() {
    console.log("Hello, " + name);
  }
  return greet;
}

const greetAlice = makeGreeter("Alice");
const greetBob   = makeGreeter("Bob");

greetAlice(); // Hello, Alice
greetBob();   // Hello, Bob
```

`makeGreeter` has finished running — its scope is "gone" — and yet each returned function still knows its own `name`. Each closed over its own separate backpack.

---

## Why a programmer would care: private state

JavaScript has no built-in way to make a variable truly private. Closures fill that gap:

```js
function makeCounter() {
  let count = 0; // unreachable from outside

  return {
    increment() { count += 1; },
    decrement() { count -= 1; },
    value()     { return count; }
  };
}

const counter = makeCounter();
counter.increment();
counter.increment();
counter.decrement();

console.log(counter.value()); // 1
console.log(counter.count);   // undefined — truly hidden
```

`count` cannot be read or overwritten directly. The three methods share the same live `count` because they all closed over the same outer scope. This is one of the most common patterns in everyday JavaScript.

---

**One-sentence summary:** a closure is a function that remembers the variables around it when it was created, and keeps access to them even after that surrounding code has stopped running.