<!-- before / electron-pro / so-231767-python-yield / run 1 -->

**Duration**: 84.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 84.51s > 60s

---
Here is a thorough explanation of `yield` and generators in Python:

---

## What `yield` Does

When Python sees `yield` inside a function, it **transforms that function into a generator function**. The critical difference from a regular function:

- A **regular function** executes its body immediately when called and returns one value.
- A **generator function** does **not execute at all** when called. Instead, it returns a **generator object** — a frozen, stateful iterator waiting to be driven.

```python
def regular():
    return 42

def generator():
    yield 42

r = regular()    # r is 42, the function ran to completion
g = generator()  # g is a generator object, NO code has run yet
```

---

## What `_get_child_candidates` Actually Returns

When this line runs:

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

The call returns a **generator object** — not a list, not a single element. The function body hasn't executed a single line yet. The generator holds:

- A reference to the function's code
- The current execution state ("not started")
- All local variable bindings (`distance`, `min_dist`, `max_dist`, etc.)

---

## How Iteration Works: Run, Pause, Resume, Stop

The generator's body only runs when something requests the next value (via `next()` internally). Each call resumes from where it last paused, runs until it hits a `yield`, emits that value, and **pauses again** with all state preserved.

Tracing through `_get_child_candidates`:

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild    # PAUSE POINT 1 — emit left child if condition met
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild   # PAUSE POINT 2 — emit right child if condition met
    # Body ends → StopIteration raised automatically
```

- **First pull**: runs from the top, evaluates the first `if`, either yields `_leftchild` and pauses, or falls through to the second `if`.
- **Second pull**: resumes, evaluates the second `if`, either yields `_rightchild` and pauses, or falls through.
- **Third pull** (or after the second yield): hits the end of the function → Python raises `StopIteration` automatically. The generator is exhausted.

The function can yield **0, 1, or 2** values total, depending on the conditions.

---

## How `candidates.extend(...)` Drives the Generator

`list.extend()` accepts **any iterable** — lists, tuples, sets, generators. Internally it repeatedly calls `next()` until it catches `StopIteration`, appending each yielded value.

So:

```python
candidates.extend(node._get_child_candidates(...))
```

is functionally equivalent to:

```python
for child in node._get_child_candidates(...):
    candidates.append(child)
```

`extend` is what *drives* the generator — pulling values out one at a time, running the function body in chunks between yields. Zero, one, or two child nodes end up in `candidates`.

---

## Why Use `yield` Instead of Returning a List?

The list-based equivalent would be:

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    result = []
    if self._leftchild and distance - max_dist < self._median:
        result.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        result.append(self._rightchild)
    return result
```

Reasons to prefer `yield`:

1. **No ceremony** — no `result = []`, no `.append()`, no `return result`. The code reads as a direct description of what to emit.
2. **Uniform interface** — `extend`, `for` loops, `list()`, `sum()`, `any()` — all consume iterables. A generator plugs into this entire ecosystem.
3. **Short-circuit friendly** — if the consumer stops early (e.g., only needs the first result), the generator stops too. No wasted computation.
4. **Composability** — generators can be chained, piped through `itertools`, or wrapped in other generators without materializing intermediate lists.

---

## Lazy Evaluation and Memory Efficiency

**Lazy evaluation** means values are computed only when actually needed — not upfront. Generators embody this:

```python
# Eager: builds 1,000,000 integers in memory immediately
def squares_eager(n):
    return [x * x for x in range(n)]

# Lazy: computes one integer at a time, uses O(1) memory regardless of n
def squares_lazy(n):
    for x in range(n):
        yield x * x
```

In the tree-search code, `candidates` is a work queue (a stack via `.pop()`). With a generator, no intermediate list is ever allocated — child nodes flow directly from the generator into `candidates.extend`. Across thousands of node visits in a deep tree, this meaningfully reduces allocator pressure.

Lazy evaluation also enables things that are impossible with eager lists:

```python
def count_forever():
    n = 0
    while True:
        yield n
        n += 1

# Works fine — never holds all values in memory
import itertools
list(itertools.islice(count_forever(), 5))  # [0, 1, 2, 3, 4]
```

An eager `count_forever()` that returns a list could never exist.

---

## Full Execution Trace (One Loop Iteration)

1. `node = candidates.pop()` — a node is removed from the work queue.
2. `distance = node._get_dist(obj)` — its distance is computed.
3. Distance check passes → `result` gets the node's values.
4. `_get_child_candidates(...)` is called → **a generator object is created, no code runs yet**.
5. `candidates.extend(generator)` begins pulling from it.
6. Generator body runs to the first `yield` (if condition is true) → emits left child into `candidates`, pauses.
7. Generator resumes, runs to the second `yield` (if condition is true) → emits right child, pauses.
8. Generator hits end of function → `StopIteration` → `extend` stops.
9. While loop repeats with newly added children in the queue.

The generator is a clean, allocation-free way to say: *"conditionally produce the left child, then conditionally produce the right child"* — without ever building an intermediate data structure to hold those results.