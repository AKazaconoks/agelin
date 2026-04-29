<!-- before / bash-expert / so-231767-python-yield / run 3 -->

**Duration**: 56.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough breakdown of `yield` and generators in Python:

---

## What `yield` Does

The `yield` keyword transforms a function into a **generator function**. Instead of running to completion and returning a value, a generator function produces values one at a time and **pauses** between each one, preserving its internal state.

Think of it like a bookmark: when `yield` is hit, the function marks its place, hands out the current value, and waits. When the next value is requested, it resumes from that exact spot.

---

## What `_get_child_candidates` Returns

When you call `node._get_child_candidates(distance, min_dist, max_dist)`, **no code inside the function runs yet**. You get back a **generator object** — not a list, not a single element:

```python
gen = node._get_child_candidates(distance, min_dist, max_dist)
type(gen)  # <class 'generator'>
```

The generator is a "promise" to produce values on demand.

---

## How the Execution Unfolds

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild       # <-- pause point 1
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild      # <-- pause point 2
```

1. **First value requested**: function starts, checks first `if`, either yields `self._leftchild` (pauses) or skips to second `if`.
2. **Second value requested**: resumes after the first `yield`, checks second `if`, either yields `self._rightchild` or falls off the end.
3. **Third request**: no more `yield` → generator raises `StopIteration` silently and is exhausted.

So it can yield **0, 1, or 2** values depending on the conditions.

---

## How `candidates.extend(...)` Consumes It

`list.extend()` accepts any iterable, including generators. It internally calls `next()` on the generator repeatedly until it's exhausted:

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))

# Equivalent to:
for child in node._get_child_candidates(...):
    candidates.append(child)
```

The caller's `while candidates:` loop then pops each node and repeats the process, gradually traversing the tree.

---

## Why Reach for `yield` Instead of Returning a List?

| Concern | `return list` | `yield` (generator) |
|---|---|---|
| Memory | Allocates full list upfront | Allocates one value at a time |
| Lazy? | No — computes everything | Yes — computes on demand |
| Can stop early? | No | Yes — unused values never computed |
| Works with `extend`/`for`? | Yes | Yes |

For this specific example the difference is small (0–2 items). But the pattern scales: if you had a function that could yield thousands of candidates from a large tree, a generator avoids building a massive intermediate list on every node visit.

```python
# 100 million numbers — ~800 MB
big_list = [x for x in range(100_000_000)]

# Same range — ~200 bytes regardless of size
big_gen = (x for x in range(100_000_000))
```

The generator stores only its current local state and position — not all the values.

---

## The Iterator Protocol Under the Hood

Generators automatically implement Python's iterator protocol (`__iter__` + `__next__`), which is why they plug directly into `for` loops, `extend()`, `list()`, `sum()`, and anything else that iterates. `yield` is simply the cleanest way to write a custom iterator without manually implementing a class with `__iter__` and `__next__` methods.