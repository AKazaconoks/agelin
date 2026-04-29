<!-- after / electron-pro / so-132988-is-vs-equals-python / run 2 -->

**Duration**: 32.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## `==` vs `is` in Python

### Core difference

- **`==`** calls `__eq__` — tests **value equality**
- **`is`** compares `id()` — tests **object identity** (same memory address)

---

### Why small integers fool you (CPython interning)

CPython pre-allocates integer objects in the range **-5 to 256**. Every reference to `5` reuses the same object, making `is` *look* like value comparison — but only by accident:

```python
n = 5
n is 5    # True — only because CPython reuses the object

n = 1000
n is 1000  # False — outside the interned range
```

This is a CPython implementation detail. **Never rely on it.**

---

### Why `L is [1]` is always `False`

Every time you write `[1]`, Python allocates a **brand-new list object**, regardless of contents. So even when `L == [1]` is `True`, the two lists are at different addresses:

```python
L = [1]
L == [1]   # True  — same value
L is [1]   # False — [1] on the right is a new object every time
```

---

### The practical rule

| Situation | Use |
|---|---|
| Compare values (numbers, strings, lists, ...) | `==` |
| Check if it's the exact same object | `is` |
| Check for `None` | `is None` / `is not None` |

`None` is a singleton, so `is None` is both correct and idiomatic:

```python
if x is None:       # correct and idiomatic
    ...
if x == None:       # works, but linters will warn you
    ...
```

---

### Your `print` syntax

`print 'Yay!'` (no parentheses) is **Python 2** only and a `SyntaxError` in Python 3. Use `print('Yay!')` for all new code.

---

**TL;DR:** Always use `==` for value comparison. Use `is` only when you explicitly need to check that two names point to the *exact same object* — the canonical real-world use case is `if x is None`.