<!-- before / bash-expert / so-231767-python-yield / run 1 -->

**Duration**: 50.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough explanation of `yield` and Python generators:

---

## What `yield` does

`yield` turns a function into a **generator function**. Instead of running to completion and returning a single value, it can produce a series of values one at a time — pausing execution and preserving all local state between each value produced.

When Python sees `yield` inside a function, calling that function does *not* run the body. It returns a **generator object**. The body only runs when something iterates over that object.

---

## What `_get_child_candidates` actually returns

```python
gen = node._get_child_candidates(distance, min_dist, max_dist)
# gen is a <generator object>, NOT a list or a child node
```

Depending on the conditions, it can lazily produce **0, 1, or 2 values**:
- 0 if neither child's distance condition is met
- 1 if only one branch qualifies
- 2 if both branches qualify

---

## How execution flows in your example

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

Step by step:
1. `_get_child_candidates(...)` is called — a generator object is created. **The function body does not run yet.**
2. `extend()` starts iterating the generator, asking for its first value.
3. The function body runs until the first `yield self._leftchild` — execution **pauses here**, and `_leftchild` is handed to `extend()`.
4. `extend()` asks for the next value — execution **resumes** after the first `yield`, continues to the second `if`, and either yields `_rightchild` or falls off the end of the function.
5. When the function body ends with no more `yield`s, the generator raises `StopIteration` internally — `extend()` catches this and stops.

No repeated manual calls, no index tracking — the generator handles all of it.

---

## When does it stop?

The generator stops when the function body runs out of `yield` statements — i.e., when execution reaches the end of the function. There's no explicit signal needed; Python handles it automatically.

---

## Why use `yield` instead of returning a list?

**Memory efficiency.** The list-based equivalent:
```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    result = []
    if self._leftchild and distance - max_dist < self._median:
        result.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        result.append(self._rightchild)
    return result
```
This works identically for small cases, but allocates a temporary list on every call. With `yield`, no list is ever built — values flow directly into `extend()` on demand.

**Lazy evaluation.** If the caller breaks early, unneeded values are never computed. This matters enormously in tree traversal over large datasets.

**Cleaner code.** No temporary container to manage — just `yield` values as you encounter them.

---

## The big picture

A generator is an **iterator you write with function syntax**. Anywhere Python expects something iterable — `for` loops, `list()`, `extend()`, `sum()`, etc. — a generator works. It's the idiomatic Python way to represent a sequence of values computed on demand, especially when:
- The full sequence would be expensive or large to hold in memory
- You're traversing a tree or graph
- You're building a processing pipeline