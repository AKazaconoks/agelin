<!-- after / electron-pro / so-1132941-mutable-default-arg / run 2 -->

**Duration**: 41.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the full explanation:

---

## Why Python's Mutable Default Argument Is a Trap

### The Core Rule

**Default argument values are evaluated once, at function *definition* time — not at call time.**

When Python executes a `def` statement, it builds the function object and immediately evaluates every default expression. The resulting objects are stored in a tuple on the function itself, accessible as `foo.__defaults__`. For your example:

```python
def foo(a=[]):
    ...
```

A single list `[]` is created when the `def` runs and stored permanently at `foo.__defaults__[0]`. Every call to `foo()` binds the name `a` to *that same list object* — Python never creates a new one.

### Why the List Grows

The key distinction is **rebinding** vs. **mutating**:

- `a = []` inside the function would create a new list and rebind the local name `a` — the stored default is untouched.
- `a.append(5)` calls a method *on the object `a` points to*, modifying it in-place.

Because `a` points to the default list object, every `append` permanently modifies it. You can see this directly:

```python
foo()
foo()
print(foo.__defaults__)  # ([5, 5],) — the list lives right here
```

Immutable types (integers, strings, tuples) can't be mutated, so this trap never appears with them.

### The Idiomatic Fix: Use `None` as a Sentinel

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

Each call without an argument now creates a fresh list. `None` is an immutable singleton, safe as a default. Per PEP 8, use `is None` (not `== None`) for singleton comparisons.

### When It's Intentional

This behavior is sometimes exploited on purpose — for example, as a simple function-level cache:

```python
def cached_fib(n, _cache={0: 0, 1: 1}):
    if n not in _cache:
        _cache[n] = cached_fib(n - 1) + cached_fib(n - 2)
    return _cache[n]
```

The dict persists across calls by design. In modern code, `functools.lru_cache` is preferred for memoization, but the pattern shows the behavior is a feature — just a surprising one when unintended.

### Summary

| Question | Answer |
|---|---|
| When are defaults evaluated? | Once, when the `def` statement executes |
| Where are they stored? | On the function object in `func.__defaults__` |
| Why does the list grow? | `append` mutates the stored object; it is never replaced |
| The fix? | Default to `None`, construct the mutable inside the body |