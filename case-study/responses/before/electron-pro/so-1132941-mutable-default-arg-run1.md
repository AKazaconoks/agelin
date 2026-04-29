<!-- before / electron-pro / so-1132941-mutable-default-arg / run 1 -->

**Duration**: 67.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 67.47s > 60s

---
Here is a thorough explanation of what's happening and how to fix it:

---

## The Core Mechanism: Defaults Are Evaluated Once, at `def` Time

When Python encounters a `def` statement, it executes it as a **runtime operation**. As part of that, it evaluates every default argument expression and stores the resulting objects on the function itself — in `function.__defaults__`. This happens **once**, when the `def` runs, not on every call.

You can see this directly:

```python
>>> foo.__defaults__
([],)         # before any calls — one tuple holding the default list
>>> foo()
[5]
>>> foo.__defaults__
([5],)        # the SAME list object, now mutated
```

When you call `foo()` without an argument, Python doesn't create a new `[]`. It binds the name `a` to the already-existing object stored in `__defaults__`. Both the local `a` and the slot in `__defaults__[0]` point at **the same object in memory**.

`a.append(5)` mutates that object in place. The local name `a` disappears when the call ends, but the object lives on in `__defaults__` — mutated, ready to surprise you on the next call.

### Why Only Mutable Types

This bites you specifically with **mutable** types (`list`, `dict`, `set`, user instances) because their contents can change without producing a new object. With an immutable default like `int` or `str`, "mutation" operations actually create a new object and rebind the local name, leaving `__defaults__` untouched:

```python
def bar(n=0):
    n += 1      # creates a NEW int; the default slot is never touched
    return n

>>> bar()   # 1
>>> bar()   # 1 — always
```

---

## The Idiomatic Fix: The `None` Sentinel

```python
def foo(a=None):
    if a is None:
        a = []      # a brand-new list, created at call time
    a.append(5)
    return a
```

`None` is an immutable singleton — perfectly safe to store in `__defaults__` because nothing can mutate it. It acts as a signal: "the caller didn't pass this argument." The `if a is None:` guard creates a **fresh list on every call** that omits `a`, so mutations are fully isolated to that invocation.

(`is None` rather than `== None` is the accepted idiom — it checks object identity directly and cannot be fooled by a custom `__eq__`.)

---

## One Case Where Mutable Defaults Are Intentional: Memoization

Because the mutable default persists across calls, it can serve as a **per-function cache**:

```python
def fibonacci(n, _cache={0: 0, 1: 1}):
    if n not in _cache:
        _cache[n] = fibonacci(n - 1, _cache) + fibonacci(n - 2, _cache)
    return _cache[n]
```

The `_cache` dict accumulates results across calls — no module-level global, no decorator needed. The leading underscore signals "don't pass this manually." That said, `@functools.lru_cache` or `@functools.cache` are the modern, thread-safe, preferred alternatives for production use.

---

## Mental Model

> **`def` is an executable statement that runs once. Default values are ordinary Python objects stored on the function. Anything you can do to an object after creation, Python will happily do to a default.**

The rule of thumb: **never use a mutable object as a default argument value** unless you're deliberately exploiting the persistence. Use `None` and the sentinel pattern instead.