<!-- after / bash-expert / so-231767-python-yield / run 1 -->

**Duration**: 52.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full explanation from the agent:

---

## Python's `yield` keyword and Generators

### 1. What happens when `_get_child_candidates` is called?

**Neither a list nor a single element is returned.** Instead, a **generator object** is returned immediately — without executing any of the function body.

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
# ↑ This line gets a generator object back. No code inside the function has run yet.
```

The presence of `yield` anywhere in a function body makes Python treat the entire function as a **generator function** — a factory that produces generator objects when called.

---

### 2. When do subsequent calls stop?

Each call to `_get_child_candidates` creates a new generator object. The generator's body actually runs when `candidates.extend()` iterates over it.

Each generator can yield **0, 1, or 2** child nodes depending on the distance conditions. Once it's yielded everything it's going to yield, it's **exhausted** — further iteration raises `StopIteration` internally, which tells `extend()` to stop.

---

### 3. What does `yield` do mechanically?

`yield` creates a **suspension point** in function execution:

1. **On call** — A generator object is created; no code runs yet.
2. **On first `next()`** — Execution begins from the top, runs until the first `yield`, pauses there, and returns the yielded value. Local variables and execution position are frozen in memory.
3. **On subsequent `next()`** — Execution resumes right after the `yield` and runs until the next `yield` or until the function ends.
4. **When the function ends** — `StopIteration` is raised automatically, signaling the iterator is done.

In your example:
```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild   # Pause #1 — return leftchild, freeze here
    # Resumes here on next iteration
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild  # Pause #2 — return rightchild, freeze here
    # Function ends → StopIteration
```

---

### 4. Why use `yield` instead of returning a list?

**Memory efficiency.** A list-based version allocates a container and populates it upfront, even if the caller only needs one element. Generators produce values **on demand**:

```python
# List version — always allocates, even for 0 items
def get_children_list(self, distance, min_dist, max_dist):
    children = []
    if self._leftchild and distance - max_dist < self._median:
        children.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        children.append(self._rightchild)
    return children
```

**Lazy evaluation.** In a tree traversal where the search space can be huge, generators mean: unused branches cost nothing. If the search finds the answer early and stops iterating, the remaining candidates are never computed.

**Composability.** Generators plug directly into Python's iteration protocol — `for` loops, `list()`, `extend()`, `itertools.chain()` — all without you implementing `__iter__` / `__next__` manually.

**Separation of concerns.** `_get_child_candidates` only answers *"which children qualify?"*. The caller decides what to do with them. Clean, decoupled logic.

---

### The bigger picture

In your tree search, `yield` makes the algorithm memory-efficient and scalable: no matter how large the tree, candidate generation never allocates more than it needs to produce the next node. That's the core reason programmers reach for `yield` — it turns a "compute everything, then hand it over" pattern into a "compute one thing, hand it over, pause, repeat" pattern.