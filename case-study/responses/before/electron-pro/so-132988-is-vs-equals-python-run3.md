<!-- before / electron-pro / so-132988-is-vs-equals-python / run 3 -->

**Duration**: 47.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown of `==` vs `is` in Python:

---

## `==` — Value Equality

Asks: **"Do these two objects have the same value?"**

It invokes the `__eq__` method, which each type defines. For lists: element-by-element comparison. For integers: numeric equality.

---

## `is` — Identity Equality

Asks: **"Are these two variables pointing to the exact same object in memory?"**

It compares memory addresses (via `id()`). No `__eq__` involved.

```python
a = [1, 2, 3]
b = a          # same object
a is b         # True

c = [1, 2, 3]  # new object, same contents
a is c         # False
```

---

## Why Small Integers Seem to Work with `is` (CPython Interning)

CPython **pre-allocates and caches** integer objects in the range **-5 to 256**. Since `5` is in that range, both `n = 5` and the literal `5` point to the same cached object:

```python
a = 5
b = 5
a is b  # True — same cached object (CPython implementation detail!)
```

But outside that range it breaks:

```python
a = 1000
b = 1000
a is b   # False — two separate objects
a == b   # True
```

**Never rely on this.** It's an interpreter optimization, not a language guarantee.

---

## Why `is` Fails for Lists

Every list literal `[1]` creates a **brand new object** in memory — no caching exists for lists:

```python
L = []
L.append(1)

L == [1]  # True  — same contents
L is [1]  # False — [1] is a freshly allocated object; different address
```

---

## When to Use Each

| Situation | Use |
|---|---|
| Comparing values (numbers, strings, lists, etc.) | `==` |
| Checking against `None` | `is` / `is not` |
| Checking against `True` / `False` | `is` (if ever needed) |
| Verifying two vars reference the *same* object | `is` |

The most important practical rule: **always use `is None`, never `== None`** — `None` is a singleton, `is` is both correct and idiomatic. Linters like `flake8` will flag `== None` as an error (E711).

```python
# Correct
if value is None:  ...
if value is not None:  ...

# Wrong (works, but semantically incorrect)
if value == None:  ...
```

---

**TL;DR:** Use `==` to compare values. Use `is` only for `None`, `True`, `False`, or when you intentionally need to verify two variables are the same object in memory.