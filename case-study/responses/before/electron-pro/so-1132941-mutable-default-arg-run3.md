<!-- before / electron-pro / so-1132941-mutable-default-arg / run 3 -->

**Duration**: 45.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a precise explanation of what is happening and why.

---

## The Root Cause: Defaults Are Evaluated Once, at Definition Time

When Python executes a `def` statement, it creates a function object **immediately**. Any default argument values are evaluated **at that moment** — exactly once — and stored as a tuple on the function object itself under `__defaults__`:

```python
>>> foo.__defaults__
([5, 5, 5],)   # the same list object, mutated by prior calls
```

The `[]` in `def foo(a=[])` is not a blueprint or template. It is a single, concrete list object allocated when the `def` runs. Every call to `foo()` that omits `a` receives a reference to that **same object** — not a new copy.

---

## Why the List Grows

The key is the difference between **mutation** and **rebinding**:

- `a.append(5)` mutates the object `a` refers to **in place**. Because `a` refers to the single default list, that default list itself changes permanently.
- If the code had written `a = a + [5]`, it would create a **new** list and rebind the local name `a` — the default object would remain untouched.

Step by step:

| Call | Default list before | Operation | Default list after | Return value |
|------|--------------------|-----------|--------------------|--------------|
| 1st  | `[]`               | `.append(5)` | `[5]`           | `[5]`        |
| 2nd  | `[5]`              | `.append(5)` | `[5, 5]`        | `[5, 5]`     |
| 3rd  | `[5, 5]`           | `.append(5)` | `[5, 5, 5]`     | `[5, 5, 5]`  |

---

## The Idiomatic Fix

Use `None` as a sentinel and allocate a fresh list inside the function body:

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

**Why this works:**

- `None` is an immutable singleton — it can never be mutated, so `foo.__defaults__` stays `(None,)` forever.
- The `a = []` line runs **at call time**, not definition time. Each call gets a brand-new list object allocated on the heap, independent of every other call.
- `is None` (identity check) is used instead of `== None` (equality check) because you want to test for the exact sentinel object, not equality that could be overridden by `__eq__`.

---

## Summary

| Aspect | Detail |
|---|---|
| When defaults are evaluated | Once, when `def` executes |
| Where defaults live | `function.__defaults__` tuple, on the function object |
| Why the bug occurs | All calls share one default list; `.append()` mutates it in place |
| The fix | Use `None` as default; allocate a new list inside the body |
| Why the fix works | Allocation happens at call time — each call gets its own list |

This is not a bug in Python — it is a direct consequence of Python's object model: variables are names bound to objects, functions are objects, and default values are objects stored on functions. The surprise only comes from carrying over intuitions from languages where defaults behave like per-call literals.