<!-- after / bash-expert / so-132988-is-vs-equals-python / run 3 -->

**Duration**: 44.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full answer:

---

## `==` vs `is` in Python

**No, they are not equivalent** — they test fundamentally different things.

---

### `==` — Value equality

`==` calls `__eq__()` and compares **contents/value**, regardless of whether the two objects are the same object in memory:

```python
a = [1, 2, 3]
b = [1, 2, 3]
a == b  # True — same contents
```

---

### `is` — Identity

`is` checks whether two variables point to the **exact same object in memory** — equivalent to `id(a) == id(b)`:

```python
a = [1, 2, 3]
b = a        # same object
c = [1, 2, 3]  # new object, same contents

a is b  # True
a is c  # False
```

---

### Why small integers appear to work with `is`

CPython **interns (caches) integers from -5 to 256** for performance. There's only one object in memory for each of those values, so `is` accidentally works:

```python
a = 5
b = 5
a is b  # True — CPython reuses the same object

x = 300
y = 300
x is y  # False (usually) — separate objects, outside the cached range
x == y  # True
```

This is a **CPython implementation detail** — don't rely on it. Other Python implementations may behave differently.

---

### Why `L is [1]` fails

Every `[1]` literal creates a **brand new list object**:

```python
L = []
L.append(1)

L == [1]   # True — same contents
L is [1]   # False — different objects in memory

[1] is [1]  # False — two separate objects created
```

---

### The rule of thumb

| Use | When |
|-----|------|
| `is` | Only for singletons: `None`, `True`, `False` |
| `==` | All value/content comparisons |

```python
if value is None:   # Correct
if flag is True:    # Correct (though `if flag:` is more Pythonic)
if n == 5:          # Correct
if my_list == [1]:  # Correct
```

---

### Python 3.8+ note

Python 3.8+ emits a `SyntaxWarning` if you use `is` with a literal:

```
SyntaxWarning: "is" with a literal. Did you mean "=="?
```

This was added specifically to catch the `if n is 5:` mistake.