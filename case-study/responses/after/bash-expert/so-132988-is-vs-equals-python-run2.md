<!-- after / bash-expert / so-132988-is-vs-equals-python / run 2 -->

**Duration**: 44.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## `==` vs `is` in Python

### The core difference

| Operator | What it tests | How it works |
|----------|--------------|--------------|
| `==` | **Value equality** | Calls `__eq__()` — compares contents |
| `is` | **Object identity** | Compares `id()` — same object in memory? |

---

### Why your integer example *sometimes* works (but is unreliable)

```python
n = 5
print(n is 5)  # Often True — but don't rely on it!
```

CPython pre-creates and **interns** (reuses) integer objects in the range **-5 to 256**. So `n = 5` and the literal `5` happen to point to the same cached object. Outside that range, it breaks:

```python
a = 257
b = 257
print(a is b)  # False (usually) — two different objects
```

This is a CPython implementation detail, not guaranteed by the language spec.

---

### Why the list example fails

```python
L = [1]
M = [1]
print(L == M)  # True — same contents
print(L is M)  # False — two different objects in memory
```

Every time you write `[1]`, Python allocates a **new list object**. Even though the contents are identical, they live at different memory addresses. `is` checks addresses, so it returns `False`.

---

### When to use each

**Use `==`** — for nearly everything. Value comparisons of numbers, strings, lists, dicts, custom objects.

**Use `is`** — specifically for:
- **`None`**: `if value is None:` — the idiomatic and correct way, because `None` is a singleton
- **`True` / `False`**: `if flag is True:` (though `if flag:` is usually better)
- **Explicit identity checks**: when you genuinely need to know if two variables reference the exact same object

```python
# Correct
if result is None:
    return default

# Dangerous — relies on CPython internals
if result is 0:   # Don't do this
    ...
```

---

**Golden rule**: use `==` unless you specifically need to verify two names point to the *same object*. Reserve `is` for singletons (`None`, `True`, `False`) and intentional identity checks.