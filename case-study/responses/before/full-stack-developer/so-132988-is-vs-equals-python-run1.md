<!-- before / full-stack-developer / so-132988-is-vs-equals-python / run 1 -->

**Duration**: 47.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the complete breakdown:

---

## `==` vs `is` in Python

### The Fundamental Difference

| Operator | Tests | Question asked |
|----------|-------|----------------|
| `==` | **Value equality** | "Do these two objects have the same value?" |
| `is` | **Identity equality** | "Are these two variables pointing to the same object in memory?" |

`is` is equivalent to `id(a) == id(b)` — it checks memory addresses.

```python
a = [1, 2, 3]
b = [1, 2, 3]
c = a

a == b   # True  — same value
a is b   # False — different objects in memory
a is c   # True  — c is an alias for the exact same object as a
```

---

### Why `n is 5` Appears to Work (Integer Interning)

CPython pre-allocates and caches integer objects for values in the range **-5 to 256**. Since small integers are used constantly, reusing a single object is a performance optimization. Both `n = 5` and the literal `5` resolve to the **same cached object**.

```python
a = 5;    b = 5;    a is b   # True  — same cached object
a = 1000; b = 1000; a is b   # False — outside the cache, two different objects
```

This is a CPython **implementation detail** — not guaranteed by the language spec and won't hold in PyPy, Jython, etc. **Never rely on it.**

---

### Why Lists Don't Work with `is`

Every list literal creates a **brand new object** in memory — no caching or interning. So `L is [1]` is always `False`, because the `[1]` on the right is a freshly created list object, never the same object as `L`.

---

### When to Use Which

**Use `==` for virtually everything** — value comparison is almost always what you want.

**Use `is` only for:**

```python
# 1. Checking for None — the canonical, recommended pattern
if result is None: ...
if result is not None: ...

# 2. Intentional identity checks (same object, not just equal value)
if current_node is root_node: ...
```

`None` is a **singleton** — there is exactly one `None` in any Python process, so `is None` is reliable and idiomatic.

---

### Gotchas

**Python 3.8+ warns you** when you use `is` with a literal:
```
SyntaxWarning: "is" with a literal. Did you mean "=="?
```

**String interning** can fool you the same way integers do — short strings may or may not be interned, making `is` unreliable for strings too.

**`==` is overridable; `is` is not.** `==` calls `__eq__`, which a class can customize. `is` always does a raw pointer comparison.

---

### Summary

```
is  → identity → "same object in memory?" → use for None / intentional identity
==  → equality → "same value?"            → use for everything else
```

When in doubt, use `==`.