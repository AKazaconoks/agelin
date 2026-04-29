<!-- after / full-stack-developer / so-132988-is-vs-equals-python / run 2 -->

**Duration**: 45.9s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /==\s+(checks|compares|tests)\s+(for\s+)?(value\s+)?equality/i | output did not match /equality\s+operator/i | output did not match /(values?|contents?)\s+(are\s+)?equal/i

---
Here's the full explanation:

---

## `==` vs `is` in Python

### The fundamental difference

- **`==` (equality):** Tests whether two objects have the **same value** — calls `__eq__` under the hood.
- **`is` (identity):** Tests whether two variables point to the **exact same object in memory** — same `id()`.

---

### Why `n is 5` can return `True` (but don't rely on it)

CPython **caches small integers** in the range **-5 to 256**. Because `5` is in that range, both `n` and the literal `5` happen to point to the same cached object. This is a CPython implementation detail, not a language guarantee:

```python
x = 1000
x is 1000  # False — two separate objects
```

This also applies to short strings — interning is unpredictable and should never be relied upon.

---

### Why `L == [1]` is `True` but `L is [1]` is `False`

Every time you write `[1]`, Python **constructs a brand-new list object**. So `L` and `[1]` are two different objects that happen to hold the same value. Lists are never interned, so `is` is almost always `False` when comparing against a list literal.

---

### When to use each

| Use case | Operator |
|---|---|
| Comparing values (numbers, strings, lists…) | `==` |
| Checking for `None` | `is` — always write `if x is None:` |
| Two variables refer to literally the same object | `is` |

**The golden rule:** use `==` for values, use `is` only for `None`, `True`, and `False`.

---

### Python 3.8+ gotcha

Using `is` with literals now raises a `SyntaxWarning`:

```
SyntaxWarning: "is" with a literal. Did you mean "=="?
```

Python is explicitly telling you this is almost certainly a bug. Also, your example uses Python 2 `print` syntax (`print 'Yay!'`) — in Python 3 it's `print('Yay!')`.