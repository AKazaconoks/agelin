<!-- after / electron-pro / so-1132941-mutable-default-arg / run 1 -->

**Duration**: 38.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## The Mutable Default Argument Trap

### Why it happens

**Default argument values are evaluated exactly once — at function *definition* time, not at call time.**

When Python executes a `def` statement, it evaluates all default expressions immediately and stores the resulting objects as a tuple on the function object in `__defaults__`. You can see this directly:

```python
def foo(a=[]):
    a.append(5)
    return a

print(foo.__defaults__)  # ([],)  ← the actual list object used as the default
```

Every call to `foo()` that omits `a` receives a reference to that **same list object** — not a fresh copy. When you call `a.append(5)`, you mutate the object in place, so the next call finds it already containing `[5]`.

| Event | State of the default list |
|-------|--------------------------|
| `def foo(a=[])` executes | `[]` (created once, stored on `foo.__defaults__[0]`) |
| First `foo()` call | `[5]` |
| Second `foo()` call | `[5, 5]` |
| Third `foo()` call | `[5, 5, 5]` |

You can even watch it mutate between calls:

```python
foo()
print(foo.__defaults__)  # ([5],)
foo()
print(foo.__defaults__)  # ([5, 5],)
```

Immutable defaults (`0`, `""`, `None`, tuples) are unaffected because operations on them always produce *new* objects — they can't be mutated in place. Mutable defaults (`list`, `dict`, `set`, custom objects) accumulate state because mutation changes the object itself, not the binding.

This is not a Python bug — it's a deliberate consequence of the object model. Functions are first-class objects, and their defaults are ordinary object references stored on that object, evaluated when the `def` runs.

---

### The idiomatic fix: use `None` as a sentinel

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

`None` is immutable and a safe sentinel. The `if a is None` check (`is`, not `==`, for identity) creates a **fresh list on every call** where the caller didn't supply one.

After the fix every call to `foo()` returns `[5]`, and callers who pass their own list still get the expected mutation behavior:

```python
my_list = [1, 2, 3]
foo(my_list)  # [1, 2, 3, 5]  ← their list, mutated as expected
foo()         # [5]            ← fresh list, not my_list
```

**Rule of thumb:** never use a mutable object as a default argument. Always default to `None` and construct the mutable object inside the function body.