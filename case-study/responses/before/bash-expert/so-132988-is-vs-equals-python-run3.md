<!-- before / bash-expert / so-132988-is-vs-equals-python / run 3 -->

**Duration**: 41.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /==\s+(checks|compares|tests)\s+(for\s+)?(value\s+)?equality/i | output did not match /equality\s+operator/i | output did not match /(values?|contents?)\s+(are\s+)?equal/i

---
Here's the full breakdown:

## `==` vs `is` in Python

**`==`** compares **values** (calls `__eq__`).
**`is`** compares **identity** — whether both sides are the exact same object in memory (equivalent to `id(a) == id(b)`).

---

### Why the integer tests seem equivalent (but aren't)

CPython **interns** small integers from **-5 to 256**, keeping exactly one object per value. So `n = 5` and the literal `5` point to the same object, making `n is 5` accidentally `True`.

```python
a = 5;    b = 5;    print(a is b)     # True — interned
x = 1000; y = 1000; print(x is y)     # False — not interned
x = 1000; y = 1000; print(x == y)     # True — values match
```

This is a **CPython implementation detail** — never rely on it. Other Python implementations won't guarantee this.

---

### Why `L is [1]` is always `False`

Every time you write `[1]`, Python constructs a **new list object** in memory. So `L` and the literal `[1]` are always two distinct objects, regardless of their contents:

```python
L = [1]
M = [1]
print(L == M)   # True  — same contents
print(L is M)   # False — different objects
print([1] is [1])  # False — two separate allocations
```

---

### The golden rule

| Use | When |
|---|---|
| `==` | You want to compare **values** (the usual case) |
| `is` | You want to check **object identity** |

The canonical `is` use cases:

```python
if value is None:    # correct — None is a singleton
if value is True:    # sometimes correct (strict identity check)
if list1 is list2:   # checking two vars reference the same list
```

**Never** write `== None` — always use `is None`. And never rely on `is` working for integers, strings, or any other type where you care about the value.