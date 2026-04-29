<!-- after / electron-pro / so-1132941-mutable-default-arg / run 3 -->

**Duration**: 30.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## The "Mutable Default Argument" Trap

### Why it happens: default arguments are evaluated once, at definition time

When Python encounters a `def` statement, it executes it immediately — evaluating all default argument expressions **once**, right then, and storing the resulting objects on the function itself in an attribute called `__defaults__`.

```python
def foo(a=[]):
    a.append(5)
    return a

print(foo.__defaults__)  # ([],)  ← the list lives here
```

That `[]` is not a recipe saying "make a new empty list each call." It is a single list object, allocated once when the `def` line runs and permanently attached to `foo`. Every call to `foo()` that omits `a` gets a reference to that **same** object. Because lists are mutable, each `a.append(5)` modifies the one shared list in place, and the mutation persists.

### Mental model: the function object is a container

```
foo
 ├── __code__      → compiled bytecode
 ├── __defaults__  → ([5, 5, 5, 5],)   ← grows with every call
 └── ...
```

The default is a slot in that struct — not re-evaluated on each invocation.

### Why immutable defaults hide this

```python
def bar(x=0):
    x += 1
    return x
```

This is safe because `x += 1` doesn't mutate the integer `0` — it rebinds the local name `x` to a new integer. The object stored in `__defaults__` is never touched. Mutable defaults are dangerous precisely because they *can* be mutated in place without rebinding the name.

### The idiomatic fix: use `None` as a sentinel

```python
def foo(a=None):
    if a is None:
        a = []
    a.append(5)
    return a
```

`None` is a harmless immutable singleton. The guard `if a is None: a = []` creates a **fresh list on each call** when no argument is supplied. This is the universally accepted Python idiom.

Use `is None`, not `== None` and not `if not a:` — the last form would also swallow a legitimately passed empty list.

### Summary

| Fact | Detail |
|------|--------|
| When defaults are evaluated | Once, when `def` executes |
| Where they live | `function.__defaults__` tuple |
| Why mutables are dangerous | In-place mutation changes the stored object permanently |
| Idiomatic fix | `def foo(a=None)` + `if a is None: a = []` |