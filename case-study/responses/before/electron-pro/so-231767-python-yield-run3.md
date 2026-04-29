<!-- before / electron-pro / so-231767-python-yield / run 3 -->

**Duration**: 64.3s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 64.27s > 60s

---
Here is a thorough explanation of `yield`:

---

## The `yield` Keyword in Python

### The Short Answer

`yield` turns a function into a **generator function**. Instead of computing all results and returning them in a list, it produces values **one at a time**, pausing execution between each one and resuming from where it left off when the next value is requested.

---

### 1. What Happens When `_get_child_candidates` Is Called?

When this function is called, **no code inside it runs yet.** Python immediately returns a **generator object** — a lazy iterator that holds a reference to the function body and its local state.

```python
node._get_child_candidates(distance, min_dist, max_dist)
# --> returns <generator object _get_child_candidates at 0x...>
#     The function body has NOT executed yet.
```

Execution only begins when the caller asks for the next value (via `next()`, a `for` loop, or `extend()`). Here is the lifecycle:

| Event | What Happens |
|---|---|
| Function called | Generator object created. Body does not run. |
| First value requested | Body runs until the first `yield`. Value is produced. |
| Second value requested | Body resumes from just after the first `yield`. |
| No more `yield` statements | Generator raises `StopIteration`. It is exhausted. |

So for any given node, this generator will produce **0, 1, or 2 values** depending on which `if` branches are true — and then it stops automatically.

---

### 2. What Is a Generator?

A **generator** is an object that implements Python's iterator protocol: it has a `__next__()` method that returns the next value, or raises `StopIteration` when done.

The magic of `yield` is that it **suspends the function's frame** — its local variables, instruction pointer, everything — and hands a value to the caller. When the next value is requested, execution resumes exactly where it paused.

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild          # <-- suspend, emit _leftchild
    # --- resumes here on second next() call ---
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild         # <-- suspend, emit _rightchild
    # --- function returns, StopIteration is raised ---
```

A regular `return` would discard all local state. `yield` preserves it.

---

### 3. Why Use `yield` Instead of Returning a List?

Consider the list-based alternative:

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    result = []
    if self._leftchild and distance - max_dist < self._median:
        result.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        result.append(self._rightchild)
    return result
```

This works, but `yield` is preferable:

| Concern | List Return | Generator (`yield`) |
|---|---|---|
| Memory | Allocates a list per call | No allocation; values flow through lazily |
| Eagerness | All values computed before caller runs | Values computed only when needed |
| Early exit | Full list always built | Caller can stop consuming mid-stream |
| Composability | Returns a concrete type | Returns an iterator; composes with any loop |

For a tree search processing thousands of nodes, avoiding per-call list allocations adds up meaningfully.

---

### 4. Tracing the Caller

```python
candidates.extend(
    node._get_child_candidates(distance, min_dist, max_dist)
)
```

`candidates.extend(generator)` is what **drives** the generator. `extend` calls `next()` on the generator in a loop internally, collecting each yielded value. The generator is fully consumed in that single `extend` call — but it only ever holds one candidate node in memory at a time as it does so.

Concrete trace:

```
--- Iteration 1 ---
node = root
gen = root._get_child_candidates(5.2, min_dist, max_dist)

# extend(gen) internally does:
#   next(gen) -> left branch true  -> yields root._leftchild
#   next(gen) -> right branch true -> yields root._rightchild
#   next(gen) -> function ends     -> StopIteration (extend stops)

candidates = [root._leftchild, root._rightchild]

--- Iteration 2 ---
node = root._rightchild
gen = node._get_child_candidates(9.1, min_dist, max_dist)

#   next(gen) -> both branches false -> StopIteration immediately
#   extend() adds nothing

candidates = [root._leftchild]
# ... continues until candidates is empty
```

---

### Summary

- Calling a generator function returns a **generator object immediately**, without running the body.
- `yield` **suspends** execution and emits a value; the frame is frozen until the next `next()` call.
- `extend()`, `for` loops, and `list()` all **consume** generators by calling `next()` repeatedly.
- The generator is **exhausted** when the function body runs out of `yield` statements.
- The core benefit over a list return: **lazy evaluation** — values are produced on demand, with no intermediate allocation per call.