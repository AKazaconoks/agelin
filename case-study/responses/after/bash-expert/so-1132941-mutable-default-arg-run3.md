<!-- after / bash-expert / so-1132941-mutable-default-arg / run 3 -->

**Duration**: 33.1s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(default\s+(value|argument)s?\s+(are|is)\s+(only\s+)?(evaluated|created|constructed)\s+once)/i | output did not match /(evaluated\s+(only\s+)?once|created\s+(only\s+)?once|once\s+at\s+(function\s+)?(definition|def))/i | output did not match /(shared|same)\s+(across|between)\s+(calls|invocations)/i

---
Here is a thorough explanation of what's happening and how to fix it:

---

## Why Mutable Default Arguments Are Surprising in Python

### 1. Default arguments are evaluated **once**, at function definition time

When Python encounters:

```python
def foo(a=[]):
    ...
```

it creates the empty list `[]` **exactly once** — at the moment the `def` statement is executed — and stores it as the default value for `a`. That same list object is reused on every subsequent call where no argument is passed.

You can observe this directly:

```python
print(foo.__defaults__)  # ([],)
foo()
print(foo.__defaults__)  # ([5],)
foo()
print(foo.__defaults__)  # ([5, 5],)
```

The default value itself is being mutated.

### 2. Lists are **mutable** — `append` modifies in-place

`a.append(5)` does not create a new list. It modifies the existing list object. Since the default value is that same persistent list, each call leaves the list one element longer than before.

---

## The Idiomatic Fix

Use `None` as the sentinel default, then create a fresh list inside the function body:

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

Now every call without an argument gets its own independent list:

```
>>> foo()
[5]
>>> foo()
[5]
>>> foo()
[5]
```

---

## Key Rule

**Never use a mutable object (`[]`, `{}`, `set()`) as a default argument value.** Always use `None` and initialize inside the function. This applies to lists, dicts, sets, and any other mutable type.