<!-- before / full-stack-developer / so-132988-is-vs-equals-python / run 2 -->

**Duration**: 37.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a clear breakdown:

---

## `==` vs `is` in Python

| Operator | Tests | Mechanism |
|---|---|---|
| `==` | Value equality | Calls `__eq__()` on the object |
| `is` | Object identity | Compares `id()` — same memory address |

---

### Why `n is 5` appears to work (but is unreliable)

CPython **interns (caches) small integers in the range -5 to 256**. Every reference to `5` points to the same pre-allocated object, so `is` returns `True` by coincidence.

```python
n = 1000
m = 1000
n == m   # True  — values match
n is m   # False — outside the cache range, two separate objects
```

This is a **CPython implementation detail**, not guaranteed by the language spec. Never rely on `is` for integer comparison.

---

### Why `L is [1]` always fails

Every time `[1]` appears as a literal, Python constructs a **brand new list object** at that moment. Lists are mutable and are never interned, so two separate `[1]` literals will always have different `id()`s — even this is always `False`:

```python
[1] is [1]   # False — two construction events, two objects
```

---

### When to use which

**Use `==` for value comparison** — almost always the right choice:
```python
if status_code == 200: ...
if name == "Alice": ...
```

**Use `is` only for identity/singleton checks**, the canonical case being `None`. PEP 8 explicitly recommends this:
```python
if x is None:    # Correct
if x == None:    # Works, but a custom __eq__ could fool it
```

`None` is a singleton (exactly one `None` exists per Python process), so `is None` is both semantically correct and marginally faster since it skips `__eq__` dispatch.

---

**Rule of thumb:** use `==` when you care about what something *contains*, and `is` when you care whether two names point to the *exact same object* — which in practice means almost exclusively `is None`.