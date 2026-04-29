<!-- after / full-stack-developer / so-132988-is-vs-equals-python / run 3 -->

**Duration**: 57.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## `==` vs `is` in Python

### The core distinction

| Operator | Tests | Technical term |
|---|---|---|
| `==` | Same **value**? | Value equality |
| `is` | Same **object in memory**? | Object identity |

`x is y` is exactly equivalent to `id(x) == id(y)`.

---

### Why `n is 5` appears to work (but is unreliable)

CPython pre-creates and caches integer objects for values **-5 to 256** at startup. So `n = 5` and the literal `5` both refer to the *same cached object*, making `is` return `True` — but this is an implementation accident, not a language guarantee.

```python
n = 1000
print(n is 1000)  # False — outside the cache, two separate objects
```

This behavior varies across Python implementations (PyPy, Jython, etc.). **Always use `==` for numeric comparisons.**

---

### Why `L is [1]` fails

Every `[]` literal creates a **brand-new list object** at evaluation time. `L` was created by one `[]`, and `[1]` in the `if` statement is a different object with the same contents. No caching exists for lists (they're mutable, so invisible sharing would cause bugs).

```python
L = [1]
M = [1]
L == M   # True  — same contents
L is M   # False — different objects

N = L    # N is an alias for L
L is N   # True  — same object
```

---

### When to use which

| Situation | Use |
|---|---|
| Comparing values (numbers, strings, lists, dicts, objects) | `==` |
| Checking for `None` | `is None` / `is not None` |
| Checking for `True`/`False` (rare) | `is True` / `is False` |
| Verifying two names refer to the exact same mutable object | `is` |

**`None` is the canonical use case for `is`:** `None`, `True`, and `False` are singletons — Python guarantees only one instance of each exists. Using `is None` also bypasses `__eq__`, so a misbehaving class can't fool it:

```python
if result is None:      # correct and safe
if result == None:      # works, but a custom __eq__ could lie
```

---

**TL;DR:** Use `==` for value comparison everywhere. Use `is` only for `None`/`True`/`False` checks, or when you explicitly need to know if two names point to the *same object* (e.g., aliasing checks).