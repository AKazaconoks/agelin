<!-- after / electron-pro / so-231767-python-yield / run 2 -->

**Duration**: 70.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 70.49s > 60s

---
Here is a thorough explanation of `yield` and Python generators:

---

## What happens when `_get_child_candidates` is called

When you call `node._get_child_candidates(distance, min_dist, max_dist)`, **the function body does not execute at all.** Python sees `yield` inside the function and silently transforms it into a **generator function**. Calling it returns a **generator object** immediately — a small, inert object that merely *remembers* where to start when asked.

So this line:

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

is equivalent, conceptually, to:

```python
gen = node._get_child_candidates(...)  # body has NOT run yet
candidates.extend(gen)                  # NOW the body runs, on demand
```

The return type is not a list, not a single element, and not `None`. It is a `<generator object>`.

---

## What a generator object is

A generator is an **iterator** — it implements two special methods:

- `__iter__()` — returns itself, making it usable in `for` loops and `extend()`.
- `__next__()` — runs the function body **up to the next `yield`**, hands back the yielded value, then **freezes the frame** (locals, instruction pointer, everything) until the next call.

When there is nothing left to yield, `__next__()` raises `StopIteration`, signalling exhaustion.

```python
gen = node._get_child_candidates(distance, min_dist, max_dist)
child = next(gen)   # runs body up to first yield, returns that child
child = next(gen)   # resumes, runs to second yield or end
next(gen)           # raises StopIteration — nothing left
```

The key mental model: **a generator object is a paused function with a bookmark inside it.**

---

## How execution pauses and resumes at `yield`

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild      # PAUSE POINT A
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild     # PAUSE POINT B
```

**First `next()` call:**
1. Execution enters the function body from the top.
2. The first `if` is evaluated. If `True`, `yield self._leftchild` sends out the value *and* suspends the frame there.
3. If `False`, execution falls through to the second `if`.

**Second `next()` call:**
1. Execution *resumes immediately after the last `yield`* — not from the top.
2. The second `if` is evaluated; if `True`, `self._rightchild` is yielded and the frame suspends again.

**Third `next()` call:**
1. The function body has no more statements; it falls off the end.
2. Python raises `StopIteration` automatically.

This is fundamentally different from `return`. A `return` destroys the frame. A `yield` *preserves* it.

---

## Why `candidates.extend(...)` works with the generator

`list.extend()` accepts any **iterable**. Internally it does roughly:

```python
def extend(self, iterable):
    for item in iterable:   # calls __next__() repeatedly, stops on StopIteration
        self.append(item)
```

So `extend` drives the generator by calling `next()` in a loop. Each call resumes the body, runs to the next `yield`, gets a child node back, and appends it. When `StopIteration` is raised, `extend` stops. The generator produces 0, 1, or 2 values depending on which conditions are `True` — the caller doesn't need to care.

---

## When do subsequent calls stop

Each iteration of the `while` loop pops one node and potentially adds 0–2 children back into `candidates`. The loop stops when `candidates` is empty — when no node yielded any children (all conditions were `False`). Each individual generator lives for just one `extend` call; a fresh generator is created on the next iteration.

---

## Practical benefits of `yield` over returning a list

### Memory efficiency

A list version allocates a new collection on every call. For a function yielding thousands of database rows or lines from a huge log file:

```python
def read_large_file(path):
    with open(path) as f:
        for line in f:
            yield line.strip()
```

The list version loads the entire file into memory. The generator version holds **one line at a time**, regardless of file size — O(1) working memory instead of O(n).

### Early exit / short-circuit

Because a generator is lazy, the consumer can stop consuming whenever it wants — work already skipped is never done.

### Composable pipelines

Generators compose naturally with no intermediate collections:

```python
lines  = read_large_file("/var/log/app.log")
errors = (l for l in lines  if "ERROR" in l)
parsed = (parse(l) for l in errors)
```

The entire pipeline processes one element at a time; memory is bounded by a single element's size.

### Infinite sequences

```python
def integers_from(n):
    while True:
        yield n
        n += 1
```

A list cannot represent an infinite sequence. A generator can.

---

## Summary

| Property | `return list` | `yield` (generator) |
|---|---|---|
| When body executes | On call | On demand, per `next()` |
| Memory for n items | O(n) | O(1) |
| Can be infinite | No | Yes |
| Early exit wastes work | Yes | No |
| Works with `extend`, `for`, `list()` | Yes | Yes |

The core insight: `yield` lets a function describe **how to produce a sequence** rather than materializing the whole sequence upfront. The caller decides how many elements it needs and when — and the function does only as much work as is actually consumed.