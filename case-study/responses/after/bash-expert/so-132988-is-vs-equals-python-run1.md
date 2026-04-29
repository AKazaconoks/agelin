<!-- after / bash-expert / so-132988-is-vs-equals-python / run 1 -->

**Duration**: 32.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the breakdown:

---

## `==` vs `is` in Python

### `==` — Value equality
Calls `__eq__` to compare the **contents/values** of two objects. This is what you almost always want.

### `is` — Identity (same object in memory)
Equivalent to `id(a) == id(b)`. It asks: "are these two variables pointing to the exact same object?"

---

### Why small integers seem to work with `is`

CPython **interns** (caches) small integers in the range **-5 to 256**. So `n = 5` and the literal `5` in `n is 5` happen to be the same cached object. This is a CPython implementation detail — **do not rely on it**:

```python
a = 1000
b = 1000
a is b  # False — large ints are separate objects
```

---

### Why `L is [1]` fails

Every list literal `[1]` creates a **brand-new object** in memory:

```python
L = [1]
print(id(L))    # e.g. 140234567890
print(id([1]))  # e.g. 140234567954  ← different!
```

`L == [1]` is `True` because the contents match. `L is [1]` is `False` because they are two distinct objects.

---

### The rule

| Use `is` for | Use `==` for |
|---|---|
| `None` — `if x is None:` | Numbers, strings, lists, dicts |
| Singletons (`True`, `False`) | Any content/value comparison |
| Checking two variables are literally the same object | Everything else (99% of cases) |

The canonical example: always write `if x is None:`, never `if x == None:`. For everything else, use `==`.