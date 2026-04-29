<!-- before / bash-expert / so-132988-is-vs-equals-python / run 1 -->

**Duration**: 145.9s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 145.95s > 60s

---
Great question. Here's the clear breakdown:

---

## `==` vs `is` in Python

### The core difference

| Operator | Tests | Calls |
|---|---|---|
| `==` | **Value equality** — do they have the same content? | `__eq__()` |
| `is` | **Identity** — are they the *same object* in memory? | Compares `id()` |

---

### Why `n == 5` and `n is 5` *seem* equivalent

CPython (the standard Python interpreter) **caches small integers from -5 to 256**. So `n = 5` and the literal `5` point to the *same* cached object — meaning `is` happens to return `True`.

This is an **implementation detail you must not rely on**. Python 3 even emits a `SyntaxWarning` for `n is 5`:
```
SyntaxWarning: "is" with 'int' literal. Did you mean "=="?
```

For integers outside that range (e.g., `n = 1000`), `n is 1000` will return `False` even when the value matches.

---

### Why `L is [1]` always fails

Every time a list literal like `[1]` is evaluated, Python creates a **brand new list object** with a new memory address. So `L` and `[1]` can never be the same object — `is` will always be `False`, regardless of contents.

`L == [1]` works because it compares the *elements*, not the identity.

---

### The rule of thumb

- **Use `==`** for all value/content comparisons: numbers, strings, lists, dicts, etc.
- **Use `is` only** for singleton checks:
  ```python
  if value is None: ...
  if flag is True: ...
  if flag is False: ...
  ```

`None`, `True`, and `False` are guaranteed singletons — there is exactly one instance of each in a Python process, so `is` is both correct and idiomatic for them. For everything else, use `==`.