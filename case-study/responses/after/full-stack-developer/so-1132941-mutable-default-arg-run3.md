<!-- after / full-stack-developer / so-1132941-mutable-default-arg / run 3 -->

**Duration**: 33.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(default\s+(value|argument)s?\s+(are|is)\s+(only\s+)?(evaluated|created|constructed)\s+once)/i | output did not match /(evaluated\s+(only\s+)?once|created\s+(only\s+)?once|once\s+at\s+(function\s+)?(definition|def))/i | output did not match /(shared|same)\s+(across|between)\s+(calls|invocations)/i

---
## Why Mutable Default Arguments Are a Python Gotcha

### The root cause

In Python, **default argument values are evaluated exactly once — at function definition time**, not at call time. The resulting object is stored on the function itself and reused on every call.

You can observe this directly:

```python
def foo(a=[]):
    a.append(5)
    return a

print(foo.__defaults__)  # ([],)    — the list lives here

foo()
print(foo.__defaults__)  # ([5],)   — same list, now mutated

foo()
print(foo.__defaults__)  # ([5, 5],)
```

The sequence:
1. Python parses the `def` statement and creates **one list object** `[]`.
2. That list is stored in `foo.__defaults__[0]`.
3. Each call binds `a` to **that same list**. `a.append(5)` mutates it in place.
4. The next call gets the already-mutated list, appends again, and so on.

This only bites you with **mutable** defaults (`list`, `dict`, `set`, custom objects). Immutable defaults (`int`, `str`, `tuple`) can't be changed in place, so they never exhibit this problem:

```python
def bar(x=0):
    x += 1   # creates a new int, doesn't mutate the default
    return x

bar()  # 1
bar()  # 1  — no surprise
```

---

### The idiomatic fix: sentinel `None`

Use `None` as the default and construct a fresh object inside the function body:

```python
def foo(a=None):
    if a is None:
        a = []       # brand-new list on every call
    a.append(5)
    return a

foo()  # [5]
foo()  # [5]
foo()  # [5]
```

Use `is None` (identity check) rather than `== None` — it's faster and semantically correct for a sentinel.

---

### When the "bug" is intentional

The behavior is occasionally exploited deliberately for simple memoization:

```python
def fibonacci(n, _cache={0: 0, 1: 1}):
    if n not in _cache:
        _cache[n] = fibonacci(n - 1) + fibonacci(n - 2)
    return _cache[n]
```

The dict persists across calls, giving free caching without a decorator. This is a known idiom but must be clearly commented, as it will surprise anyone who doesn't expect it.

---

### Quick reference

| Default type | Mutable? | Exhibits the gotcha? |
|---|---|---|
| `int`, `str`, `tuple` | No | No |
| `list`, `dict`, `set` | Yes | **Yes** |
| Custom mutable object | Yes | **Yes** |

**Rule of thumb:** if your default value is mutable, use `None` as the default and construct the real object inside the function.