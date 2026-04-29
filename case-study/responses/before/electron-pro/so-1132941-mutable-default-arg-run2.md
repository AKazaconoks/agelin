<!-- before / electron-pro / so-1132941-mutable-default-arg / run 2 -->

**Duration**: 70.0s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 69.95s > 60s

---
Here is a thorough explanation from the agent:

---

## The Root Cause: Default Arguments Are Evaluated Once, at Definition Time

When Python executes a `def` statement, it is not recording a template — it is running an instruction. Part of that instruction is evaluating every default argument expression **exactly once**, right then, and storing the resulting object inside the function.

So this line:

```python
def foo(a=[]):
```

does the following **at the moment Python first encounters it**:

1. Evaluates `[]` — allocates a new list object on the heap.
2. Creates a function object and stores **that exact list object** (not a copy) inside `foo.__defaults__`.

From that point on, `[]` is never evaluated again. Every call that omits `a` receives the **same list object**.

### Where the default lives: `__defaults__`

You can inspect it directly:

```python
def foo(a=[]):
    a.append(5)
    return a

foo.__defaults__        # ([],)
foo()
foo.__defaults__        # ([5],)   ← mutated in place
```

`__defaults__` is a tuple bolted to the function object. It is filled once when `def` runs. Every call that needs a default reaches into it and hands the caller **the object sitting there** — not a copy of it. `a.append(5)` mutates that object, and the mutation persists for the next call.

---

## The Idiomatic Fix: Use `None` as a Sentinel

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

**Why this works:** `None` is immutable, so the default can never accumulate state. The guard `if a is None` creates a **brand-new list on each call** where no argument was provided. That list is local to the frame and discarded when the call returns.

Use `is None` (identity check), not `== None` or `a or []` — the latter breaks if the caller intentionally passes a falsy value like `0`, `""`, or `[]`.

---

## Interesting Extensions

**Same problem with dicts and sets** — any mutable default:

```python
def bar(d={}):
    d['count'] = d.get('count', 0) + 1
    return d

bar()  # {'count': 1}
bar()  # {'count': 2}
```

**This can be exploited deliberately as a cache:**

```python
def fib(n, _cache={0: 0, 1: 1}):
    if n not in _cache:
        _cache[n] = fib(n - 1) + fib(n - 2)
    return _cache[n]
```

The leading underscore signals "not a real parameter." This is a legitimate pattern — the dict persists for the lifetime of the function object.

**It also bites `__init__`:**

```python
class Foo:
    def __init__(self, items=[]):  # broken — all instances share the same list
        self.items = items
```

Every `Foo()` without an argument will share one list. Mutating `instance1.items` mutates `instance2.items`. Same fix applies.

---

**Core mental model:** A Python function is an object. `__defaults__` is an attribute of that object, populated once at creation time. Mutable objects stored there are shared state — subject to all the usual hazards of shared mutable state.