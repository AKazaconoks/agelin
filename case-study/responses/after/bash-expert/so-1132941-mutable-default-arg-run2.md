<!-- after / bash-expert / so-1132941-mutable-default-arg / run 2 -->

**Duration**: 26.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(default\s+(value|argument)s?\s+(are|is)\s+(only\s+)?(evaluated|created|constructed)\s+once)/i | output did not match /(evaluated\s+(only\s+)?once|created\s+(only\s+)?once|once\s+at\s+(function\s+)?(definition|def))/i | output did not match /(shared|same)\s+(across|between)\s+(calls|invocations)/i

---
## Why This Happens: Mutable Default Arguments

**Default argument values are evaluated exactly once — at function definition time, not at each call.**

When Python compiles `def foo(a=[]):`, it creates a single list object and stores it permanently as the default for `a`. Every call to `foo()` without arguments gets a reference to that same, shared list object. Since `.append()` mutates it in place, the mutations accumulate across calls.

You can verify this directly:

```python
def foo(a=[]):
    print(id(a))   # prints the same memory address every time
    a.append(5)
    return a
```

The default list lives on the function object itself:

```python
>>> foo.__defaults__
([5, 5, 5, 5],)   # the mutated list, right there
```

---

## The Idiomatic Fix

Use `None` as a sentinel and create a fresh list inside the function:

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

`None` is immutable and safe as a default. A new `[]` is created on each call only when needed.

---

## The General Rule

Only use **immutable** objects as default arguments:

| Safe defaults | Unsafe defaults |
|---|---|
| `None`, `0`, `""`, `()` | `[]`, `{}`, `set()` |

This same pitfall applies to dicts, sets, and any mutable object — not just lists.