<!-- before / full-stack-developer / so-132988-is-vs-equals-python / run 3 -->

**Duration**: 44.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the complete breakdown:

---

## `==` vs `is` in Python

### The Core Distinction

| Operator | Tests | Mechanism |
|---|---|---|
| `==` | **Value equality** | Calls `__eq__()` on the object |
| `is` | **Identity** (same object in memory) | Compares `id()` of both objects |

---

### Why `n is 5` sometimes works (but you shouldn't rely on it)

CPython pre-allocates and caches integer objects for the range **-5 to 256**. Any reference to these values reuses the same cached object — so `n is 5` happens to work for small integers as a CPython implementation detail.

```python
a = 5;    b = 5;    print(a is b)     # True  (cached)
a = 1000; b = 1000; print(a is b)     # False (outside cache range)
```

This is **coincidental** and not guaranteed by the language. PyPy, Jython, or future CPython versions may behave differently.

---

### Why `L is [1]` never works

Every list literal `[1]` allocates a **brand new object**. There is no caching for lists, so the identity check always fails even when the contents are equal.

```python
L = []; L.append(1)
print(L == [1])   # True  — same contents
print(L is [1])   # False — [1] is always a freshly created object
```

---

### When to use each

**Use `==` for all value comparisons:**
```python
if n == 5: ...
if name == "Alice": ...
if scores == [10, 20, 30]: ...
```

**Use `is` only for singletons** (`None`, `True`, `False`) — these are guaranteed to be unique objects:
```python
if result is None: ...       # correct idiom
if result is not None: ...   # correct idiom
```

---

### Key Gotcha: Modern Python warns you

Since Python 3.8, using `is` with literals triggers:
```
SyntaxWarning: "is" with a literal. Did you mean "=="?
```

**The rule:** `==` for values, `is` only for `None` (and rarely `True`/`False`).