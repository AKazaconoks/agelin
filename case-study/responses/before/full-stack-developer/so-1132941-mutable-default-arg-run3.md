<!-- before / full-stack-developer / so-1132941-mutable-default-arg / run 3 -->

**Duration**: 56.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(default\s+(value|argument)s?\s+(are|is)\s+(only\s+)?(evaluated|created|constructed)\s+once)/i | output did not match /(evaluated\s+(only\s+)?once|created\s+(only\s+)?once|once\s+at\s+(function\s+)?(definition|def))/i | output did not match /(shared|same)\s+(across|between)\s+(calls|invocations)/i

---
Here is a thorough explanation of the behavior:

---

## Python Mutable Default Arguments

### Why It Happens: Definition-Time Evaluation

The root cause: **Python evaluates default argument expressions exactly once, when the `def` statement executes** — not each time the function is called.

When Python encounters:
```python
def foo(a=[]):
    a.append(5)
    return a
```

It:
1. Compiles the function body into a code object.
2. **Evaluates `[]` right now**, creating a single list object in memory.
3. Stores that list in the function's `__defaults__` tuple.
4. Binds `foo` to the new function object.

You can see this directly:
```python
print(foo.__defaults__)       # ([],)
foo(); foo()
print(foo.__defaults__)       # ([5, 5],) — same object, mutated in place
```

`__defaults__` is an immutable tuple, but the *objects it references* are mutable. Every call that uses the default binds `a` to that **same list object** — no copying, no re-evaluation. `a.append(5)` mutates it in place, and the mutation persists.

---

### Why Immutable Defaults Are Safe

With `def bar(n=0)`, doing `n += 1` doesn't mutate the integer `0` — integers are immutable. It creates a new integer object and **rebinds** the local name `n`. The object in `__defaults__` is never touched.

| Type | Dangerous as default? | Reason |
|---|---|---|
| `list`, `dict`, `set` | **Yes** | Mutated in place by `append`, `update`, etc. |
| `int`, `str`, `tuple` | No | "Modifications" produce new objects, rebind locals |
| `None` | No | Immutable singleton; cannot be mutated |

---

### The Idiomatic Fix: `None` Sentinel

```python
def foo(a=None):
    if a is None:
        a = []          # fresh list on every call that uses the default
    a.append(5)
    return a
```

Use `is None` (identity check), not `== None` (equality check) — it's faster, unambiguous, and can't be triggered by objects that happen to compare equal to `None`.

If `None` is itself a valid argument, use a custom sentinel:
```python
_MISSING = object()   # unique; nothing else can ever be `is _MISSING`

def foo(a=_MISSING):
    if a is _MISSING:
        a = []
    a.append(5)
    return a
```

---

### Bonus: Intentional Use as a Cache

The persistence is sometimes exploited deliberately:
```python
def fib(n, _cache={0: 0, 1: 1}):
    if n not in _cache:
        _cache[n] = fib(n - 1) + fib(n - 2)
    return _cache[n]
```

In modern Python you'd just use `@functools.lru_cache`, but the pattern is recognized.

---

**The one-line rule:** `def` is a runtime statement that evaluates its default expressions exactly once. Mutable objects in `__defaults__` survive across calls and accumulate changes. Default to `None`, then construct mutables inside the body.