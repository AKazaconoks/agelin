<!-- before / full-stack-developer / so-231767-python-yield / run 1 -->

**Duration**: 74.9s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 74.92s > 60s

---
Here's a thorough breakdown of `yield` and Python generators:

---

## The Core Idea

When a function contains `yield`, Python transforms it into a **generator function**. Calling it does **not** execute the body — it returns a **generator object**: a lazy iterator that produces values one at a time, on demand, pausing between each one.

---

## Answering Your Specific Questions

### What happens when `_get_child_candidates` is called?

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

No list is returned. No single element. **The function body doesn't even run yet.**

You get back a generator object — a suspended computation. `extend()` then drives it by pulling values one at a time until it's exhausted.

### When do calls stop?

The generator is exhausted when:
1. The function body **runs off the end** (no more `yield` statements to hit), or
2. A `return` statement is reached (which raises `StopIteration` internally).

For `_get_child_candidates`, each call produces **0, 1, or 2** child nodes depending on which `if` branches are true, then it's done.

### How state persists between iterations

When a generator pauses at `yield`, Python freezes the **entire execution frame**: all local variables and the exact line of code where execution stopped. Nothing is recomputed. It resumes exactly where it left off.

---

## The Full Explanation

### `yield` vs. returning a list

```python
# Builds everything into RAM immediately
def squares_list(n):
    return [i * i for i in range(n)]

# Produces one value at a time, on demand
def squares_gen(n):
    for i in range(n):
        yield i * i
```

```python
import sys
print(sys.getsizeof(squares_list(10_000_000)))  # ~85 MB
print(sys.getsizeof(squares_gen(10_000_000)))   # 112 bytes
```

### Generators can be infinite

```python
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b

from itertools import islice
print(list(islice(fibonacci(), 10)))  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
```

A list cannot be infinite. A generator can.

### Generators pipeline naturally

```python
def read_lines(filename):
    with open(filename) as f:
        for line in f: yield line.strip()

def non_empty(lines):
    for line in lines:
        if line: yield line

# File read one line at a time through the whole pipeline — no intermediate lists
rows = non_empty(read_lines("data.csv"))
```

---

## Why `_get_child_candidates` Uses `yield`

In the tree traversal, `candidates` acts as a stack. Each loop iteration pops one node and may push zero, one, or two children back:

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

Using a generator here means:
- No temporary list is allocated just to feed `extend()`
- The branching logic is expressed naturally in plain `if` statements
- If the caller ever stopped early, unneeded children would never be computed

---

## Summary Table

| Concept | Key point |
|---|---|
| `yield` in a function | Turns it into a generator factory |
| Calling a generator function | Returns a generator object; body doesn't run yet |
| `next()` / iteration | Runs body up to the next `yield`, then pauses |
| Exhaustion | When body ends or hits `return`; raises `StopIteration` |
| State preservation | Local variables and position are frozen between `yield`s |
| vs. returning a list | Lazy, memory-efficient, composable, supports infinite sequences |
| `itertools` | Standard library of generator-based combinators for pipelines |

The short version: **`yield` turns a function into a factory for a pausable, resumable iterator** — giving you clean code, zero intermediate allocations, and composability for free.