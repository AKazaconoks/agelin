<!-- before / electron-pro / so-132988-is-vs-equals-python / run 2 -->

**Duration**: 44.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the complete answer from the agent:

---

## `==` vs `is` in Python

They are **not** equivalent. They answer fundamentally different questions.

### `==` — Value Equality

Calls `__eq__` on the object. Asks: **"Do these two objects have the same value?"**

```python
a = [1, 2, 3]
b = [1, 2, 3]
print(a == b)  # True — same contents, different objects
```

### `is` — Object Identity

Compares memory addresses (`id()`). Asks: **"Are these two names pointing to the exact same object in memory?"**

```python
a = [1, 2, 3]
b = [1, 2, 3]
print(a is b)   # False — two distinct list objects

c = a           # c points to the SAME object as a
print(a is c)   # True
```

---

### Why `n is 5` appeared to work (CPython integer interning)

This is a **CPython implementation detail**, not a language guarantee. CPython pre-caches ("interns") small integers in the range **-5 to 256**. Since `5` falls in that range, `n = 5` and the literal `5` both point to the same cached object — so `is` returns `True` by coincidence.

```python
x = 1000
y = 1000
print(x is y)   # False — outside the cache range
```

This behavior is not guaranteed on PyPy, Jython, or IronPython. **Never rely on it.**

---

### Why `L is [1]` fails for lists

Every list literal creates a **brand new object** in memory:

```
L    ──► [ list @ 0x7f1a ]  contents: [1]
[1]  ──► [ list @ 0x7f2b ]  contents: [1]  ← new object
```

`==` compares the contents (equal), `is` compares the addresses (different).

---

### The Rule: When to Use Each

| | `==` | `is` |
|---|---|---|
| Question | Same value? | Same object in memory? |
| Use for | All value comparisons | Singletons only |

**Use `==`** for virtually all comparisons.

**Use `is`** only for singletons — `None`, `True`, `False` — as explicitly recommended by PEP 8:

```python
# Correct
if result is None:
    raise ValueError("No result")

# Avoid — works but bad style, triggers SyntaxWarning in Python 3.8+
if result == None:
```