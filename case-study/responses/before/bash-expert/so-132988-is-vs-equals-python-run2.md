<!-- before / bash-expert / so-132988-is-vs-equals-python / run 2 -->

**Duration**: 41.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown:

---

## `==` vs `is` in Python

### `==` — Value Equality
Tests whether two objects have the **same content/value**. It calls `__eq__()` under the hood.

```python
[1, 2, 3] == [1, 2, 3]  # True — same contents
```

### `is` — Identity Equality
Tests whether two variables point to the **exact same object in memory** (equivalent to `id(a) == id(b)`).

```python
a = [1, 2, 3]
b = [1, 2, 3]
a is b   # False — different objects, same contents
a is a   # True — same object
```

---

### Why `n is 5` works (sometimes)

Python **caches small integers** (typically -5 to 256) as a memory optimization. So every time you write `5` in your code, Python reuses the same cached object in memory. That's why `n is 5` returns `True` — it's an implementation detail, **not** a language guarantee.

```python
x = 1000
y = 1000
x is y   # May be False — not cached!
x == y   # Always True
```

**Never rely on this behavior in real code.**

---

### Why `L is [1]` fails

Lists are mutable and are **never interned**. Every list literal `[1]` creates a brand-new object, even if the contents are identical. So `L` and `[1]` will always be different objects.

---

### The Rule

| Situation | Use |
|---|---|
| Comparing values (numbers, strings, lists, dicts…) | `==` |
| Checking for `None` | `is` / `is not` |
| Checking if two vars reference the same object | `is` |

```python
# Correct
if result is None:
    handle_missing()

if my_list == [1, 2, 3]:
    do_something()
```

**The short version:** use `==` for almost everything. Use `is` only for `None` checks (and occasionally when you specifically need reference identity).