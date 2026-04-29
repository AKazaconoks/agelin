<!-- after / full-stack-developer / so-231767-python-yield / run 2 -->

**Duration**: 67.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 67.48s > 60s

---
## The `yield` Keyword and Python Generators

### The short answer

When Python sees `yield` inside a function, it transforms that function into a **generator function**. Calling it does *not* execute the body at all — it returns a **generator object**, which is a lazy iterator that produces values one at a time, on demand.

---

### What happens when `_get_child_candidates` is called

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

When `_get_child_candidates(...)` is called here, Python does **not** run any of the `if` statements inside it. Instead, it immediately hands back a **generator object** — a small stateful machine that remembers where it left off. The body sits frozen, waiting.

`list.extend()` then drives that generator by calling `next()` on it repeatedly. Each call to `next()` resumes the function body from where it last paused, runs until the next `yield`, hands back that value, and freezes again. When the function reaches its end (or a bare `return`), it raises `StopIteration`, and `extend()` stops consuming.

So `_get_child_candidates` does **not** return a list. It does not return a single element. It returns a generator object that can yield zero, one, or two children depending on which `if` branches are entered.

---

### How "resuming" works — the execution model

A normal function has one entry point and one exit point. A generator function has **one entry point and as many suspension points as there are `yield` statements**.

Walk through `_get_child_candidates` step by step:

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild      # suspension point 1
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild     # suspension point 2
```

1. **First `next()` call**: execution starts at the top. If the left-child condition is true, execution reaches `yield self._leftchild`, hands `self._leftchild` to the caller, and **freezes there** — all local variables (`distance`, `min_dist`, `max_dist`, `self`) are preserved inside the generator object.
2. **Second `next()` call**: execution resumes from exactly after the first `yield`. The right-child condition is evaluated. If true, `self._rightchild` is yielded and the function freezes again.
3. **Third `next()` call**: execution resumes, finds no more code, the function returns normally, Python raises `StopIteration`, and the caller (`extend`) knows it is done.

The generator object is just a paused stack frame plus the bookkeeping needed to resume it.

---

### Tracing through the caller

```python
result, candidates = [], [self]
while candidates:
    node = candidates.pop()
    distance = node._get_dist(obj)
    if distance <= max_dist and distance >= min_dist:
        result.extend(node._values)
    candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
return result
```

Each iteration pops one node, checks whether it is within range, then asks it for candidate children. `_get_child_candidates` yields at most two children, and `extend` appends each one to `candidates`. The loop continues until `candidates` is empty — a classic tree traversal where the frontier is grown lazily, one node at a time. No intermediate list of children is ever fully materialised.

---

### Why use `yield` instead of building and returning a list

**1. Memory efficiency** — A list materialises all values at once. A generator holds at most one value at a time. For two children this seems trivial, but the pattern scales: walking a million-node tree never requires holding all million nodes in memory simultaneously.

**2. Short-circuiting / early exit** — If the caller stops consuming early, the generator simply never runs the rest of its body. With a list, you paid the full construction cost before the caller could bail out.

**3. Composability** — Generators chain cleanly into pipelines, each stage remaining lazy until something actually iterates the end of the chain:

```python
nodes    = walk_tree(root)
filtered = (n for n in nodes if n.value > 0)
first10  = itertools.islice(filtered, 10)
```

**4. Simpler stateful iteration** — Before generators, a stateful iterator required a class with `__iter__` and `__next__` plus explicit position variables. A generator function expresses the same logic as straight-line procedural code, with `yield` marking the handoff points.

---

### The mental model in one sentence

Think of a generator function as a function taught to **pause and hand back control** at each `yield`, preserving its entire local state until the caller asks for the next value — rather than computing everything upfront and returning it all at once.