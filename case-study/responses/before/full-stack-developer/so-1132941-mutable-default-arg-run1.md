<!-- before / full-stack-developer / so-1132941-mutable-default-arg / run 1 -->

**Duration**: 40.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## The Mutable Default Argument Trap

### Why It Happens

**Default arguments are evaluated once, at function definition time — not at call time.**

When Python encounters a `def` statement, it compiles the function and evaluates all default argument expressions immediately. The resulting objects are stored on the function object itself in `__defaults__`:

```python
def foo(a=[]):
    a.append(5)
    return a

print(foo.__defaults__)   # ([],)  ← the actual list object lives here
```

This is not a template — it is a single, live list object created once. Every call that omits `a` receives that same object.

**What happens across calls:**

```
Call 1: a is foo.__defaults__[0]  →  []  →  append(5)  →  [5]
Call 2: a is foo.__defaults__[0]  →  [5]  →  append(5)  →  [5, 5]
Call 3: a is foo.__defaults__[0]  →  [5, 5]  →  append(5)  →  [5, 5, 5]
```

The crucial distinction is between **mutation** and **rebinding**:

- `a.append(5)` — mutates the object in-place; the change lives in `__defaults__`. Persists across calls.
- `a = a + [5]` — rebinds the local name `a` to a new list; `__defaults__` is untouched. Does not persist.

This is not a bug — it is the intersection of two deliberate Python design choices: eager default evaluation + mutable objects.

---

### The Idiomatic Fix: Use `None` as a Sentinel

```python
def foo(a=None):
    if a is None:
        a = []        # fresh list created on every call that needs a default
    a.append(5)
    return a
```

- `None` is immutable, so there is nothing to corrupt.
- `[]` inside the function body is evaluated at **call time**, giving each call its own new list.
- Callers who explicitly pass a list still have their list used as-is.

---

### Quick Reference

| Question | Answer |
|---|---|
| When are defaults evaluated? | Once, when `def` executes |
| Where are they stored? | `function.__defaults__` (a tuple) |
| Why does mutation persist? | The default *is* the live object; `append` mutates it in place |
| Which types are affected? | Any mutable: `list`, `dict`, `set`, custom objects |
| The fix | Default to `None`, construct the mutable inside the function body |

---

### Bonus: When This Is Intentional

The behavior can be exploited deliberately as a simple function-level cache:

```python
def cached_compute(key, _cache={}):
    if key not in _cache:
        _cache[key] = expensive_operation(key)
    return _cache[key]
```

Here the shared mutable dict is the point. This pattern is uncommon and should always be commented, since it reads as a bug to most reviewers.