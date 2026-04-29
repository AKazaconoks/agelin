<!-- after / full-stack-developer / so-132988-is-vs-equals-python / run 1 -->

**Duration**: 42.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /==\s+(checks|compares|tests)\s+(for\s+)?(value\s+)?equality/i | output did not match /equality\s+operator/i | output did not match /(values?|contents?)\s+(are\s+)?equal/i

---
Here's the full breakdown:

---

## `==` vs `is` in Python

These answer fundamentally different questions:

- **`==`** asks: *do these two objects have the same **value**?* (calls `__eq__`)
- **`is`** asks: *are these the literally **same object** in memory?* (compares `id()`)

---

### Why `n is 5` accidentally works

CPython (the standard interpreter) **pre-caches integers from -5 to 256**. Because `5` is in that range, there's only ever one integer `5` object in memory, so `n is 5` happens to return `True`.

This breaks outside that range:
```python
x = 1000
x is 1000  # False — a fresh object is allocated for 1000
```

This is a CPython implementation detail, **not a language guarantee**. Python 3.8+ even emits a `SyntaxWarning`:
```
SyntaxWarning: "is" with a literal. Did you mean "=="?
```

---

### Why `L is [1]` fails

Every time Python evaluates `[1]`, it allocates a **brand-new list object**. `L` and `[1]` have equal contents but live at different memory addresses — so `==` returns `True` (same values), but `is` returns `False` (different objects).

```python
a = [1, 2, 3]
b = [1, 2, 3]

a == b   # True  — same contents
a is b   # False — two separate list objects

c = a
a is c   # True  — c is just another name for the *same* object
```

---

### When to use each

| Use `==` | Use `is` |
|---|---|
| Comparing values (almost always) | Checking against `None`, `True`, `False` |
| Numbers, strings, lists, dicts, objects | Confirming two names point to the exact same object |

The canonical Python idioms for `is`:
```python
if value is None: ...      # correct — None is a singleton
if value is not None: ...  # correct
```

Using `== None` works but is considered wrong style — a misbehaving `__eq__` could falsely return `True` when compared to `None`. Linters (Flake8 E711, Pylint) enforce `is None`.

**Rule of thumb: use `is` only for `None`, `True`, and `False`. Use `==` for everything else.**