<!-- before / bash-expert / so-1132941-mutable-default-arg / run 3 -->

**Duration**: 72.1s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 72.13s > 60s

---
Here's a thorough explanation of what's happening and why:

---

## The Mutable Default Argument Trap

### Root cause: Default arguments are evaluated **once, at definition time**

When Python encounters a `def` statement, it evaluates all default argument expressions **immediately** and stores the resulting objects. They are **not** re-evaluated on each call.

So in:

```python
def foo(a=[]):
    a.append(5)
    return a
```

The `[]` is evaluated **once** when the function is defined, creating a single list object. That same list is reused on every call where `a` is not passed explicitly.

You can inspect this directly:

```python
def foo(a=[]):
    a.append(5)
    return a

print(foo.__defaults__)   # ([],)  — the list lives here
foo()
print(foo.__defaults__)   # ([5],)
foo()
print(foo.__defaults__)   # ([5, 5],)
```

CPython stores default values in the function object's `__defaults__` tuple. Each call without an argument receives a reference to **the exact same list object** — and `append` mutates it in place. The accumulated mutations persist because the list is never discarded.

This does **not** affect immutable types like `int`, `str`, or `tuple` — you can't mutate them in place, so each call effectively sees the "same" value without consequence.

---

### The idiomatic fix: use `None` as the sentinel

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

`None` is a singleton and immutable — safe as a default. The `[]` is now created **inside** the function body, which runs on every call, so each invocation without an argument gets a fresh, independent list.

```
>>> foo()
[5]
>>> foo()
[5]
>>> foo()
[5]
```

---

### When the "wrong" behavior is actually intentional

Occasionally, sharing state across calls is deliberate — for example, a cache:

```python
def cached_lookup(key, _cache={}):
    if key not in _cache:
        _cache[key] = expensive_computation(key)
    return _cache[key]
```

Here the mutable default is used **on purpose** as a call-level cache. The leading underscore signals "internal implementation detail." This is a niche pattern — prefer an explicit class or `functools.lru_cache` in real code — but it illustrates that the behavior itself is consistent and predictable once understood.

---

### Summary

| Aspect | Detail |
|---|---|
| When defaults are evaluated | Once, at `def` time |
| Where they're stored | `function.__defaults__` tuple |
| Why mutation persists | All calls share the same object |
| Safe default types | Immutable: `None`, `0`, `""`, `()` |
| Idiomatic fix | Default to `None`, create mutable inside the body |

Many linters (pylint, flake8-bugbear's `B006`) will flag mutable defaults as a warning precisely because this is such a common footgun.