<!-- before / full-stack-developer / so-1132941-mutable-default-arg / run 2 -->

**Duration**: 49.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough explanation:

---

## Why Python Mutable Default Arguments Bite You

### The Core Reason: Defaults Are Evaluated Once at Definition Time

When Python executes a `def` statement, it evaluates all default argument expressions **immediately and exactly once**, then stores the resulting objects on the function itself in `function.__defaults__`. They are not re-evaluated on each call.

You can observe this directly:

```python
def foo(a=[]):
    a.append(5)
    return a

print(foo.__defaults__)  # ([],)    ← before any call
foo()
print(foo.__defaults__)  # ([5],)   ← same list object, now mutated
foo()
print(foo.__defaults__)  # ([5, 5],)
```

### What Happens on Each Call

1. `foo()` is called with no argument.
2. Python looks up the default from `foo.__defaults__[0]` — the **same list object** every time.
3. The local name `a` is bound to that object (not a copy).
4. `a.append(5)` mutates the object **in-place**.
5. The function returns a reference to the same object.

Because `append` mutates without rebinding, the change persists in `__defaults__` after the function returns. Every subsequent call starts from where the previous one left off.

All return values are the **identical object in memory**:

```python
x = foo(); y = foo(); z = foo()
print(x is y is z)  # True
```

### Mutation vs. Rebinding — the Key Distinction

This only bites you with **mutating** operations (`append`, `extend`, `update`, `add`, `+=` on lists, etc.). If you rebind the local name instead, the default is never touched:

```python
def bar(a=[]):
    a = a + [5]   # creates a NEW list, rebinds local 'a'
    return a      # default [] is untouched forever
```

---

### The Idiomatic Fix: Use `None` as a Sentinel

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

`None` is immutable, so it can never be accidentally mutated. A fresh `[]` is created inside the body on each call that omits `a`. Use `is None` (identity check), not `== None`.

---

### When This Behavior Is Intentionally Useful

The persistence across calls is occasionally exploited on purpose:

**Memoization/caching** (predates `functools.lru_cache`):

```python
def fibonacci(n, _cache={0: 0, 1: 1}):
    if n not in _cache:
        _cache[n] = fibonacci(n - 1, _cache) + fibonacci(n - 2, _cache)
    return _cache[n]
```

**Function-level state without a global or a class:**

```python
def record_event(event, _log=[]):
    _log.append(event)
    return list(_log)
```

The leading underscore on `_cache`/`_log` is a convention signaling "implementation detail — callers should not pass this."

---

### Mental Model in One Sentence

> A `def` statement is executable code, and default values are the results of expressions evaluated **at that moment** — not templates re-evaluated on each call.