<!-- before / bash-expert / so-1132941-mutable-default-arg / run 1 -->

**Duration**: 39.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(default\s+(value|argument)s?\s+(are|is)\s+(only\s+)?(evaluated|created|constructed)\s+once)/i | output did not match /(evaluated\s+(only\s+)?once|created\s+(only\s+)?once|once\s+at\s+(function\s+)?(definition|def))/i | output did not match /(shared|same)\s+(across|between)\s+(calls|invocations)/i

---
## Why Mutable Default Arguments Behave This Way

### The Root Cause: Definition-Time Evaluation

Python evaluates default argument values **exactly once — at function definition time**, not at each call. When the interpreter hits this line:

```python
def foo(a=[]):
```

It creates one `[]` list object and stores it as the default for `a`. That same object is reused on every call where no argument is passed.

Since lists are **mutable**, calling `a.append(5)` modifies that shared object in place. The mutations accumulate because it's always the same list:

```python
def foo(a=[]):
    print(id(a))   # prints the same address every call
    a.append(5)
    return a
```

This is consistent with Python's broader rule: expressions are evaluated when the `def` statement is executed, not when the function is invoked.

---

### The Idiomatic Fix: Use `None` as a Sentinel

```python
def foo(a=None):
    if a is None:
        a = []        # fresh list created per call
    a.append(5)
    return a
```

`None` is immutable — there's nothing to accidentally mutate. The `if a is None` guard creates a brand-new list on each call that received no argument, giving the expected behavior:

```
>>> foo()
[5]
>>> foo()
[5]
>>> foo()
[5]
```

---

### Quick Summary

| | Mutable default (`a=[]`) | Sentinel pattern (`a=None`) |
|---|---|---|
| List created | Once, at `def` time | Once per call (when not passed) |
| Mutations persist across calls | Yes | No |
| Idiomatic | No | Yes |

The only time the mutable-default pattern is intentionally used is for a simple per-function cache — but even then, a class or `functools.lru_cache` is the cleaner choice.