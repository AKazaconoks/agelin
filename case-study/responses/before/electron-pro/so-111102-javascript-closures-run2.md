<!-- before / electron-pro / so-111102-javascript-closures / run 2 -->

**Duration**: 35.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+function\s+(returned|that\s+(uses|references|accesses))/i | output did not match /function\s+(returned\s+from|defined\s+inside|that\s+outlives)/i | output did not match /after\s+(the\s+)?outer\s+function\s+(has\s+)?(returned|finished|exited)/i

---
Here's the explanation from the agent:

---

## What a closure IS

A closure is what you get when a function **remembers the variables from the place where it was created**, even after that place has finished running.

Think of it like a backpack. When a function is created inside another function, it packs up the variables it can see and carries them along wherever it goes.

---

## What it consists of

A closure is made of two things:

- **The function itself**
- **A snapshot of the surrounding scope** — specifically, *references* to the variables the function could see when it was defined

Because it holds references (not copies), if the variable changes, the closure sees the new value.

---

## When JavaScript creates one

Every time a function is defined inside another function — automatically, no special syntax required.

```javascript
function makeCounter() {
  let count = 0;

  function increment() {
    count += 1;
    console.log(count);
  }

  return increment;
}

const counter = makeCounter(); // makeCounter has finished...
counter(); // 1  — but count is still alive
counter(); // 2
counter(); // 3

const otherCounter = makeCounter(); // brand new, independent count
otherCounter(); // 1
```

`makeCounter` returns and exits, but `count` doesn't vanish — `increment` still holds a reference to it, so JavaScript keeps it alive.

---

## Why a programmer would care

**Keeping data private** — closures let you hide state that nothing outside can touch directly:

```javascript
function makeBankAccount(startingBalance) {
  let balance = startingBalance; // inaccessible from outside

  return {
    deposit(amount)  { balance += amount; },
    withdraw(amount) { balance -= amount; },
    getBalance()     { return balance; }
  };
}

const account = makeBankAccount(100);
account.deposit(50);
account.getBalance(); // 150
account.balance;      // undefined — safely hidden
```

**Locking in configuration** — create a specialized function with some arguments pre-filled:

```javascript
function makeMultiplier(factor) {
  return (number) => number * factor;
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

double(5); // 10
triple(5); // 15
```

**Callbacks and event handlers** — any time you pass a function to `addEventListener` or `setTimeout`, it almost certainly closes over variables it needs later. You're already using closures without realizing it.

---

**One-sentence summary:** A closure is a function that carries the variables from its birthplace with it, keeping them alive and private for as long as the function exists.