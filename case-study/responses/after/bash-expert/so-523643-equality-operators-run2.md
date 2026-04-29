<!-- after / bash-expert / so-523643-equality-operators / run 2 -->

**Duration**: 33.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(prefer|use|always\s+use|recommend)\s+===/i | output did not match /===\s+(is\s+)?(preferred|recommended|safer)/i

---
Here is the full explanation from the agent:

---

## `==` vs `===` in JavaScript

The core difference is **type coercion**.

### The four operators

| Operator | Name | Type coercion? |
|---|---|---|
| `==` | Loose equality | Yes |
| `===` | Strict equality | No |
| `!=` | Loose inequality | Yes |
| `!==` | Strict inequality | No |

**`==` / `!=`** convert operands to the same type before comparing. **`===` / `!==`** compare both value *and* type — no conversion.

```javascript
5 ==  "5"   // true  — string coerced to number
5 === "5"   // false — different types, no coercion

null ==  undefined  // true  — special case
null === undefined  // false — different types
```

---

### Why coercion causes surprises

```javascript
[] == false   // true
"0" == false  // true
"" == 0       // true
[] == ![]     // true  (!)
```

These pass because the coercion rules are complex and non-obvious. You generally don't want this.

---

### Other comparison operators

JavaScript also has `>`, `<`, `>=`, `<=` — these **do** perform type coercion when types differ:

```javascript
"10" > 5     // true — string coerced to number
"apple" > "banana"  // false — lexicographic comparison
```

---

### What to use in everyday code

**Default to `===` and `!==` always.** They are:
- Predictable — no hidden conversions
- Slightly faster — no coercion overhead
- Clearer in intent
- What ESLint's `eqeqeq` rule enforces

The one common exception is the **null-check idiom**:

```javascript
// catches both null and undefined in one check
if (value == null) { ... }

// equivalent to:
if (value === null || value === undefined) { ... }
```

Some codebases intentionally use `== null` for this reason. Everything else: use `===`.