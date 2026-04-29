<!-- before / bash-expert / so-1132941-mutable-default-arg / run 2 -->

**Duration**: 33.3s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(default\s+(value|argument)s?\s+(are|is)\s+(only\s+)?(evaluated|created|constructed)\s+once)/i | output did not match /(evaluated\s+(only\s+)?once|created\s+(only\s+)?once|once\s+at\s+(function\s+)?(definition|def))/i | output did not match /(shared|same)\s+(across|between)\s+(calls|invocations)/i

---
Here's the full explanation from the agent:

---

## The Mutable Default Argument Problem

### Why It Happens

**Default argument values are evaluated exactly once — at function definition time, not at each call.**

When Python parses `def foo(a=[]):`, it creates a single list object and stores it inside the function object under `foo.__defaults__`. You can observe this directly:

```python
>>> foo.__defaults__
([],)          # before any calls — empty list

>>> foo()
[5]
>>> foo.__defaults__
([5],)         # same list object, mutated

>>> foo()
[5, 5]
>>> foo.__defaults__
([5, 5],)      # still the same object
```

Every call to `foo()` without an argument reuses **the same list object**. `list.append()` mutates that object in place, and since the mutation persists in `__defaults__`, the next call sees the already-modified list. The behavior compounds with each call.

This is not a bug — it is perfectly consistent with Python's object model. A default argument is just a reference stored on the function object. If that object is mutable, mutations are visible everywhere the object is referenced.

Immutable defaults (integers, strings, tuples, `None`) don't have this problem because they **cannot** be mutated in place.

---

### The Idiomatic Fix

Use `None` as a sentinel and create a fresh object inside the function body:

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

Now every call without an argument gets a brand-new list. Callers who pass their own list explicitly still work correctly — and the function won't silently clobber shared state.

---

### Mental Model

> Default argument values are **part of the function object**, not part of the call frame. They are born once and live as long as the function does.

Once that clicks, the behavior is completely predictable — and `None`-as-sentinel becomes second nature.