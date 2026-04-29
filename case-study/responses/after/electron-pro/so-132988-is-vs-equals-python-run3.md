<!-- after / electron-pro / so-132988-is-vs-equals-python / run 3 -->

**Duration**: 53.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown:

---

## `==` vs `is` in Python

### The core distinction

- **`==`** tests **value equality** — it calls `__eq__()` and asks "do these represent the same value?"
- **`is`** tests **identity** — it asks "are these the exact same object in memory?" (equivalent to `id(a) == id(b)`)

---

### Why integers *seem* interchangeable (but aren't)

CPython pre-allocates ("interns") a cache of integer objects for the range **-5 to 256**. Every reference to `5` in your program points to the same cached singleton object. So `n is 5` happens to be `True` — but only by accident.

```python
n = 5
n is 5      # True  — lucky: both hit the cached singleton

x = 1000
y = 1000
x is y      # False — outside the cache, two separate objects
```

CPython 3.8+ even emits a `SyntaxWarning: "is" with a literal. Did you mean "=="?` to warn you about this.

---

### Why it breaks for lists

Every list literal `[1]` constructs a **brand-new object** at that moment — there's no list interning:

```
L ──────────────► [ list object @ 0x7f3a ]  contents: [1]
[1] literal ────► [ list object @ 0x7f9b ]  contents: [1]
```

`==` walks both and compares contents → `True`.  
`is` compares addresses → `False`.

---

### When to use each

| Situation | Use |
|---|---|
| Comparing values (numbers, strings, lists, dicts…) | `==` |
| Checking for `None` | `is` / `is not` |
| Checking if two names alias the same object | `is` |

**`is None` is the canonical Python idiom** and the primary correct use of `is`:

```python
# Correct — None is a true singleton
if result is None: ...
if result is not None: ...

# Wrong — technically works but semantically incorrect
# (a class could override __eq__ to equal None)
if result == None: ...
```

**Rule of thumb:** use `==` for values, use `is` only for `None`.