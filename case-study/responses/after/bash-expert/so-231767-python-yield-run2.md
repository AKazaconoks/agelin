<!-- after / bash-expert / so-231767-python-yield / run 2 -->

**Duration**: 52.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough explanation of `yield` in Python:

---

## What is `yield`?

The `yield` keyword transforms a regular function into a **generator** — an object that produces values one at a time, on demand, rather than computing everything upfront and returning it all at once.

---

## What happens when `_get_child_candidates` is called?

When Python sees `node._get_child_candidates(distance, min_dist, max_dist)`, it does **not** execute the function body. It immediately returns a **generator object**:

```python
gen = node._get_child_candidates(distance, min_dist, max_dist)
# type(gen) → <class 'generator'>
```

No list. No single value. Just a generator — a "recipe" for producing values when asked.

---

## What does `yield` do, mechanically?

Each time `yield` is hit, Python:

1. **Pauses** execution at that exact line
2. **Returns** the yielded value to the consumer
3. **Remembers** its exact position and all local state
4. **Waits** until the next value is requested

A minimal demo:

```python
def simple_gen():
    print("Starting")
    yield 1
    print("After first yield")
    yield 2
    print("Done")

gen = simple_gen()
next(gen)  # prints "Starting", returns 1
next(gen)  # prints "After first yield", returns 2
next(gen)  # prints "Done", raises StopIteration
```

In your `_get_child_candidates`:
- If the left-child condition is true → `yield self._leftchild` pauses, returns the left child
- Execution resumes, checks the right-child condition
- If true → `yield self._rightchild` pauses, returns the right child
- Function ends naturally → `StopIteration` is raised internally

So it yields 0, 1, or 2 values total, depending on which conditions match.

---

## How does `candidates.extend(...)` work with a generator?

`list.extend()` accepts any iterable. It internally calls `next()` on the generator in a loop until `StopIteration`:

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))

# Equivalent to:
for child in node._get_child_candidates(distance, min_dist, max_dist):
    candidates.append(child)
```

So `extend` fully drains the generator, appending 0, 1, or 2 child nodes.

---

## When does it stop?

A generator is exhausted when:
- The function body reaches its end (your case)
- An explicit `return` is hit
- An unhandled exception is raised

After that, any further `next()` call raises `StopIteration`, which signals `extend` (and `for` loops) to stop.

---

## Why use `yield` instead of returning a list?

```python
# List version — allocates a temporary list every call
def get_children_list(self, distance, min_dist, max_dist):
    result = []
    if self._leftchild and distance - max_dist < self._median:
        result.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        result.append(self._rightchild)
    return result

# Generator version — no allocation, values produced on demand
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild
```

The key advantages:

| | `return list` | `yield` (generator) |
|---|---|---|
| Memory | Allocates a list per call | No allocation |
| Lazy? | No — computes everything upfront | Yes — values produced on demand |
| Early exit | Wasted work still done | Only computes what's consumed |
| Composable | Must materialize to chain | Can chain generators freely |

In your tree traversal, every node call generates 0–2 candidates without allocating any intermediate lists. Across a deep tree with thousands of nodes, that's significant.

---

## The key mental model

A regular function is a machine that runs to completion and hands you a box of results.

A generator function is a machine that you crank one step at a time — it hands you one result, then freezes in place until you crank it again. It only does work when you ask for the next value.