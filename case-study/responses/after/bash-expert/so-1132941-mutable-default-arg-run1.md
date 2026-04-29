<!-- after / bash-expert / so-1132941-mutable-default-arg / run 1 -->

**Duration**: 37.1s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(default\s+(value|argument)s?\s+(are|is)\s+(only\s+)?(evaluated|created|constructed)\s+once)/i | output did not match /(evaluated\s+(only\s+)?once|created\s+(only\s+)?once|once\s+at\s+(function\s+)?(definition|def))/i | output did not match /(shared|same)\s+(across|between)\s+(calls|invocations)/i

---
Here is the full explanation:

---

## The Mutable Default Argument Problem

### Why it happens

**Default argument expressions are evaluated exactly once — at function definition time, not at call time.**

When Python executes `def foo(a=[]):`, it creates a single list object `[]` and stores it in the function's `__defaults__` tuple. Every call to `foo()` that omits `a` receives a reference to that *same* list. When you mutate it with `.append()`, the mutation persists on the function object itself.

You can observe this directly:

```python
def foo(a=[]):
    a.append(5)
    return a

print(foo.__defaults__)  # ([],)
foo()
print(foo.__defaults__)  # ([5],)
foo()
print(foo.__defaults__)  # ([5, 5],)
```

The list lives inside `foo.__defaults__` and survives between calls, accumulating state.

### The idiomatic fix

Use `None` as a sentinel and create the mutable object inside the function body:

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

`None` is immutable, so it can never be accidentally mutated. A fresh `[]` is created on every call that doesn't pass an explicit `a`.

### Extra nuance

- **Any mutable type** has this issue: `dict`, `set`, custom objects — not just `list`.
- The behavior is **sometimes intentional**. A `dict` default is a common cheap memoization cache:
  ```python
  def fib(n, cache={}):   # shared cache across all calls — deliberate
      ...
  ```
- **Best practice**: default to immutable sentinels (`None`, `0`, `""`, `()`, `frozenset()`). Create mutable objects inside the function when each call should get its own fresh copy.