<!-- after / full-stack-developer / so-1132941-mutable-default-arg / run 1 -->

**Duration**: 54.2s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(default\s+(value|argument)s?\s+(are|is)\s+(only\s+)?(evaluated|created|constructed)\s+once)/i | output did not match /(evaluated\s+(only\s+)?once|created\s+(only\s+)?once|once\s+at\s+(function\s+)?(definition|def))/i | output did not match /(shared|same)\s+(across|between)\s+(calls|invocations)/i

---
## Python Mutable Default Arguments Explained

---

### 1. Definition Time vs. Call Time Evaluation

The root cause is a deliberate design decision: **Python evaluates default argument expressions exactly once**, when the `def` statement executes — not each time the function is called.

When Python encounters:
```python
def foo(a=[]):
    a.append(5)
    return a
```

It executes the `def` statement, evaluates `[]` (producing a single list object in memory), and binds that object as the default for `a`. Every subsequent call to `foo()` that omits `a` receives a reference to **that same list** — not a fresh one.

---

### 2. The `__defaults__` Attribute

You can observe this directly — the default is stored as a tuple on the function object itself:

```python
def foo(a=[]):
    a.append(5)
    return a

print(foo.__defaults__)            # ([],)
print(id(foo.__defaults__[0]))     # e.g. 140234567890

foo()
print(foo.__defaults__)            # ([5],)
print(id(foo.__defaults__[0]))     # same id — the exact same list object
```

The identity (`id`) never changes. There is **one list object**, stored in `foo.__defaults__[0]`, and every call that uses the default is handed a reference to it.

---

### 3. Why Mutation Persists Across Calls

Python's argument passing is **pass-by-object-reference**. Calling `foo()` is effectively:

```python
a = foo.__defaults__[0]   # a refers to the same list
a.append(5)               # mutates it in-place
```

Methods like `list.append`, `list.extend`, `dict.update`, and `set.add` mutate the object **in place** — they don't create a new object. So the change is visible on the next call because the default is the same object.

Contrast with reassignment, which is safe:
```python
def bar(a=[]):
    a = a + [5]   # creates a NEW list; doesn't touch the default
    return a

bar()  # [5]
bar()  # [5]  — default is still []
```

---

### 4. The Idiomatic Fix: Use `None` as a Sentinel

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a

foo()  # [5]
foo()  # [5]
foo()  # [5]  — consistently
```

Each call that omits `a` gets a **fresh list** created at call time. Using `is None` (not `== None`) is the PEP 8-mandated style — it checks identity, not equality, and can't be fooled by objects overriding `__eq__`.

---

### 5. Other Patterns and Caveats

**Dicts and sets have the same problem** — same fix applies:
```python
def add_entry(key, d=None):
    if d is None:
        d = {}
    d[key] = True
    return d
```

**Immutable defaults are safe** — strings, ints, tuples, `frozenset` cannot be mutated in place, so sharing the default object across calls is harmless. The gotcha only applies to mutable types.

**Linters will catch this** — `pylint` raises `W0102 dangerous-default-value`, `ruff` raises `B006`.

---

### Summary

| Question | Answer |
|---|---|
| When is the default evaluated? | Once, when the `def` statement executes |
| Where is it stored? | `function.__defaults__` (a tuple) |
| Why do changes persist? | The default is one shared object; mutation changes it in place |
| What is the fix? | Use `None` as default; create the mutable inside the body |

**The one-line mental model:** _"Default values are attributes of the function object, not of each call."_