<!-- before / full-stack-developer / so-111102-javascript-closures / run 1 -->

**Duration**: 31.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the explanation:

---

## What a Closure Is

When a function is defined inside another function, the inner function **remembers the variables from the outer function's scope** — even after the outer function has finished executing and its scope would normally be gone.

That memory is the closure. It is not a syntax or a keyword — it is a feature of how JavaScript functions work: **a function bundled together with the variable environment that existed when it was created.**

---

## What It Consists Of

Every closure has two parts:

1. **The function itself**
2. **A reference to the variable environment from when the function was defined** (not when it runs)

The function carries that environment with it wherever it goes. Variables do not disappear just because the outer function returned.

---

## When JavaScript Creates One

JavaScript creates a closure every time a function is defined inside another function and the inner function references a variable from the outer one.

```javascript
function makeCounter() {
  let count = 0;          // lives in makeCounter's scope

  return function () {    // this inner function closes over `count`
    count += 1;
    return count;
  };
}

const counter = makeCounter();  // makeCounter has finished running

console.log(counter());  // 1
console.log(counter());  // 2
console.log(counter());  // 3
```

`makeCounter` returned and is gone. Normally `count` would be garbage-collected. But because the returned function still references `count`, JavaScript keeps that variable alive. Each call reads and updates the **same** `count` — not a fresh copy.

---

## Why a Programmer Would Care

**1. Private state** — closures are the traditional way to hide a variable so outside code cannot touch it directly:

```javascript
function makeBankAccount(initialBalance) {
  let balance = initialBalance;  // inaccessible from outside

  return {
    deposit(amount)  { balance += amount; },
    withdraw(amount) { balance -= amount; },
    getBalance()     { return balance; }
  };
}

const account = makeBankAccount(100);
account.deposit(50);
console.log(account.getBalance());  // 150
console.log(balance);               // ReferenceError
```

**2. Pre-configured functions** — create a function once with a baked-in value, then reuse it:

```javascript
function makeMultiplier(factor) {
  return (number) => number * factor;
}

const double = makeMultiplier(2);
const triple = makeMultiplier(3);

double(5);  // 10
triple(5);  // 15
```

Each returned function remembers its own `factor`. `double` and `triple` are independent — they close over different environments.

**3. Callbacks that need context** — closures are why `.map()`, `setTimeout`, and event handlers can access surrounding variables without having them passed in explicitly.

---

## The Mental Model

Think of a closure as a **function with a backpack**. When the function is created, it packs up any outer variables it references. It carries that backpack everywhere — even long after the place where it was created no longer exists — and can always reach in to read or update what is inside.