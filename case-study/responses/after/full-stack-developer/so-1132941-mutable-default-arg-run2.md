<!-- after / full-stack-developer / so-1132941-mutable-default-arg / run 2 -->

**Duration**: 45.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough explanation of what is happening and how to fix it.

---

## Why Mutable Default Arguments Accumulate State

### The Root Cause: Defaults Are Evaluated Once, at Definition Time

Python evaluates default argument expressions **exactly once** — when the `def` statement executes, not each time the function is called.

When the interpreter hits:

```python
def foo(a=[]):
    ...
```

it creates a single list object `[]` and stores it as part of the function object itself. You can verify this directly:

```python
>>> foo.__defaults__
([5, 5, 5],)          # after three calls
>>> foo.__defaults__[0] is foo()  # the returned list IS the default
True
```

Every call to `foo()` that omits `a` receives that **same list object** — not a fresh one. The default is a fixed attribute of the function, not a recipe that re-runs at call time.

---

### Why Mutation Makes It Visible

A list is **mutable**. `a.append(5)` modifies it in place — it doesn't create a new list. Since the same object is reused on every call, each call's mutation is visible to the next:

| Call | `foo.__defaults__[0]` before | What happens | After |
|------|------------------------------|--------------|-------|
| `foo()` | `[]` | `a` is that object; append mutates it | `[5]` |
| `foo()` | `[5]` | same object; append again | `[5, 5]` |
| `foo()` | `[5, 5]` | same object; append again | `[5, 5, 5]` |

The function returns the default list itself, so callers all hold references to the same object — `foo() is foo()` is `True`.

Immutable types (int, str, tuple) cannot be mutated in place, so this problem simply cannot occur with them.

---

### The Idiomatic Fix: The `None` Sentinel Pattern

Use `None` as the default and create a fresh mutable object inside the function body:

```python
def foo(a=None):
    if a is None:
        a = []      # new list created on every call that omits `a`
    a.append(5)
    return a
```

Why `is None` specifically?
- `is None` checks **identity** (O(1), unambiguous).
- `== None` invokes `__eq__`, which a custom class could override.
- `if not a` would treat an **empty list passed by the caller** as "no argument" — silently replacing it, which is a subtle bug.

With the fix, each default call gets its own brand-new list:

```python
>>> foo()
[5]
>>> foo()
[5]
>>> foo()
[5]
```

And passing an explicit list still works correctly:

```python
>>> my_list = [1, 2]
>>> foo(my_list)
[1, 2, 5]
```

---

### Quick Mental Model

Think of `def` as a constructor for a function object. Default values are **fields on that object**, initialized when the object is built. Calling the function reads those stored fields — it does not re-run the initializers. Mutable fields can be changed by the function body, and those changes persist on the object between calls.

| Concept | Detail |
|---------|--------|
| When defaults are evaluated | Once, at `def` execution time |
| Where they live | `function.__defaults__` tuple |
| What goes wrong | A mutable default is shared; in-place mutation accumulates |
| The fix | Default to `None`; create a fresh object inside with `if a is None: a = []` |

This is intentional and consistent with how Python objects and names work everywhere else. The surprise is that `[]` in a default *looks* like "make a new list each call" — but it is just an expression evaluated once when the function is defined.