<!-- after / bash-expert / so-523643-equality-operators / run 3 -->

**Duration**: 36.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here's a thorough breakdown of JavaScript's equality operators:

---

## `==` vs `===` (and `!=` vs `!==`)

### Strict equality (`===` / `!==`)
Compares **value AND type** — no type conversion happens.

```javascript
5 === 5       // true
5 === "5"     // false (number vs string)
null === null // true
null === undefined // false
```

### Loose equality (`==` / `!=`)
Performs **type coercion** before comparing — JavaScript converts one or both operands to match types, following a complex set of rules.

```javascript
5 == "5"          // true  → "5" coerced to 5
true == 1         // true  → true coerced to 1
false == 0        // true
"" == 0           // true  → "" coerced to 0
null == undefined // true  → special case
[] == ""          // true  → array joins to ""
[] == 0           // true  → [] → "" → 0
```

---

## Are there more such operator pairs?

No other "loose vs strict" pairs exist. However, the comparison operators (`<`, `>`, `<=`, `>=`) **always** coerce types, which is its own source of surprises:

```javascript
"10" > "9"   // false — lexicographic string comparison
"10" > 9     // true  — "10" coerced to 10
```

---

## What should you use?

**Always use `===` and `!==` by default.**

The coercion rules behind `==` are notoriously unpredictable:

```javascript
0 == false     // true  (but 0 is falsy, not false)
[] == false    // true  (but [] is truthy!)
[1] == 1       // true  ([1] → "1" → 1)
[1,2] == "1,2" // true
```

The one common exception: checking for **both `null` and `undefined`** at once:

```javascript
if (value == null) { ... }  // catches both null and undefined
// equivalent to: value === null || value === undefined
```

### Practical tips
- Lint with `eqeqeq` (ESLint) to enforce `===` across a codebase.
- When you need type conversion, make it **explicit** rather than relying on `==`:

```javascript
// Bad:  userInput == 5
// Good: Number(userInput) === 5
```

The rule of thumb: **`===` makes intent clear and eliminates an entire class of subtle bugs.**