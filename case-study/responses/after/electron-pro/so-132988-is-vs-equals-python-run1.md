<!-- after / electron-pro / so-132988-is-vs-equals-python / run 1 -->

**Duration**: 49.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough breakdown:

---

## `==` vs `is` in Python: Value Equality vs Object Identity

### 1. What `==` does — Value Equality

`==` calls `__eq__` on the left-hand object, asking: **"Do these two objects represent the same value?"**

```python
[1, 2, 3] == [1, 2, 3]   # True — same contents
42        == 42.0         # True — numerically equal across types
```

It doesn't care where in memory the objects live.

---

### 2. What `is` does — Object Identity

`is` compares **memory addresses**, asking: **"Are these two names pointing to the exact same object?"**

```python
a = [1, 2, 3]
b = a           # alias — same object
a is b          # True

c = [1, 2, 3]   # new list built separately
a is c          # False — different objects
a == c          # True  — but identical value
```

---

### 3. Why `n is 5` appears to work — CPython Integer Interning

CPython **pre-allocates and caches integers in the range -5 to 256**. Every use of the literal `5` returns the same cached object, so `n is 5` accidentally returns `True` for small integers.

```python
a = 5;    b = 5;    a is b   # True  (cached)
a = 1000; b = 1000; a is b   # False (not cached)
a == b                        # True  (always)
```

This is a **CPython implementation detail** — not a language guarantee. Other Python runtimes may behave differently. Relying on `is` for integer comparison is fragile.

---

### 4. Why `L is [1]` always fails

Every time Python evaluates a list literal `[1]`, it **constructs a brand-new list object** at a fresh memory address. There is no caching for lists.

```python
[1] is [1]   # False — two separate objects created moments apart
L is [1]     # False — L is a third object
L == [1]     # True  — their contents are equal
```

---

### 5. The Golden Rule — When to use each

| Use `==` when... | Use `is` when... |
|---|---|
| Comparing values (almost always) | Checking if something **is `None`** |
| Numbers, strings, lists, dicts | Checking singletons (`True`, `False`) |

The canonical, idiomatic uses of `is` are:

```python
if result is None:      # correct — None is a guaranteed singleton
    ...

if result is not None:  # correct
    ...
```

---

### 6. String interning — another gotcha

CPython also interns some string literals (those that look like identifiers):

```python
a = "hello";       b = "hello";       a is b   # True  (interned)
a = "hello world"; b = "hello world"; a is b   # False (not interned)
a == b                                          # True  (always)
```

Always use `==` to compare string contents.

---

### Summary

```
==  →  "Do these two objects have the same value?"      (uses __eq__)
is  →  "Are these two names the same object in memory?" (uses id())
```

- `n is 5` works for small integers only because CPython caches them — it's an implementation accident.
- `L is [1]` always fails because list literals always produce new objects.
- **Use `is` only for `None` (and occasionally `True`/`False`). Use `==` for everything else.**