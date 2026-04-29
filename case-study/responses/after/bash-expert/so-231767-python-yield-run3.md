<!-- after / bash-expert / so-231767-python-yield / run 3 -->

**Duration**: 49.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown of `yield`:

---

## What `yield` does

`yield` turns a regular function into a **generator function**. Instead of computing everything and returning a value, a generator **pauses at each `yield`**, hands back a value, and **remembers exactly where it left off** until asked for the next one.

Think of it like a bookmark — you mark your place, hand the page to someone, and when they come back for more, you pick up right from the bookmark.

---

## What a generator function actually returns

Calling a generator function does **not** run it — it returns a **generator object** (an iterator):

```python
def simple():
    yield 1
    yield 2
    yield 3

gen = simple()        # Nothing executes yet
print(next(gen))      # 1  — runs until first yield, pauses
print(next(gen))      # 2  — resumes, runs until second yield, pauses
print(next(gen))      # 3  — resumes again
print(next(gen))      # StopIteration — function is done
```

---

## Execution flow in your example

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild          # pause point 1
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild         # pause point 2
```

When `candidates.extend(node._get_child_candidates(...))` runs:

1. `_get_child_candidates(...)` is called → returns a **generator object** (no code runs yet)
2. `extend()` starts iterating over it, asking for the first value
3. The function body runs — if the left-child condition is true, it **yields** `self._leftchild` and pauses
4. `extend()` appends that child to `candidates`, then asks for the next value
5. The function resumes after the first `yield`, checks the right-child condition
6. If true, yields `self._rightchild`; `extend()` appends it
7. Function reaches the end → `StopIteration` is raised internally → `extend()` stops

Depending on which conditions are true, the generator may yield **0, 1, or 2** values. `extend()` handles all cases automatically.

---

## Why use `yield` instead of building and returning a list?

| | `yield` (generator) | `return [...]` (list) |
|---|---|---|
| **Memory** | One item at a time | Entire collection up front |
| **Lazy** | Computed on demand | All computed immediately |
| **Infinite sequences** | Possible | Not possible |
| **Early exit** | Uncomputed values cost nothing | Full list built regardless |
| **Code clarity** | Reads like "here's the next thing" | Requires a temp variable |

Your tree-search is a perfect use case because:
- Each node contributes **0–2** candidates — variable output, no need for a list
- The `while` loop processes candidates one at a time — lazy is fine
- The tree can be large — you don't want to allocate a list per node

The list-based equivalent is just more boilerplate for no gain:

```python
# Equivalent without yield — more verbose, same result
def _get_child_candidates(self, distance, min_dist, max_dist):
    result = []
    if self._leftchild and distance - max_dist < self._median:
        result.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        result.append(self._rightchild)
    return result
```

`yield` is the right tool when you're producing a **sequence of values one at a time**, especially when the caller doesn't need them all at once or doesn't need them at all.