<!-- before / electron-pro / so-132988-is-vs-equals-python / run 1 -->

**Duration**: 55.9s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /==\s+(checks|compares|tests)\s+(for\s+)?(value\s+)?equality/i | output did not match /equality\s+operator/i | output did not match /(values?|contents?)\s+(are\s+)?equal/i

---
Here's a thorough breakdown of `==` vs `is` in Python:

---

## The Core Distinction

- **`==`** — **Equality**: "Do these two objects have the same *value*?" (calls `__eq__`)
- **`is`** — **Identity**: "Are these two names pointing to the *exact same object* in memory?" (compares `id()`)

---

## Why `n is 5` Appears to Work: Integer Interning

This is a CPython implementation detail called **integer caching**. CPython pre-allocates a pool of small integers in the range **-5 to 256** at startup. Every reference to `5` returns the *same cached object*, so `n is 5` happens to be `True`.

```python
a = 5
b = 5
print(a is b)   # True  — both point to the SAME cached object
print(id(a) == id(b))  # True
```

This breaks outside that range:

```python
a = 1000
b = 1000
print(a == b)   # True
print(a is b)   # False — 1000 is not cached; two separate objects were created
```

**This is not guaranteed behavior** — other Python implementations (PyPy, Jython) may behave differently. Never rely on it.

---

## Why `L is [1]` Always Fails

Every list literal `[1]` creates a **brand new object in memory**. Mutable objects are never cached or interned — it would be unsafe to share them.

```python
L = []; L.append(1)
print(L == [1])   # True  — same value
print(L is [1])   # False — L is L's object; [1] is a freshly allocated object
```

---

## When to Use Each

| Scenario | Use | Reason |
|---|---|---|
| Compare numbers, strings, lists, dicts | `==` | Value comparison |
| Check for `None` | `is` | `None` is a singleton — PEP 8 mandates this |
| Check for `True` / `False` strictly | `is` | Booleans are singletons |
| Check if two names alias the same object | `is` | Intentional identity check |
| Any integer > 256 | `==` | Interning not guaranteed |

The canonical, everyday use of `is` is:

```python
if result is None:      # correct
    ...
if result is not None:  # correct
    ...
```

Avoid `== None` — a class with a custom `__eq__` could return `True` when compared to `None`, whereas `is None` is always reliable.

**Bottom line:** Use `==` for virtually all value comparisons. Reserve `is` for `None`, `True`/`False`, and cases where you explicitly want to verify two names point to the *same object*.