<!-- after / electron-pro / so-231767-python-yield / run 3 -->

**Duration**: 50.4s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /iterator/i | output did not match /iterabl[ye]/i | output did not match /(memory[- ]?efficient|infinite\s+sequence)/i

---
Here is a thorough explanation of `yield`:

---

## What `yield` does in Python

### 1. It turns a function into a generator

When Python sees `yield` anywhere inside a function, calling that function does **not** execute its body. Instead, it immediately returns a **generator object**.

```python
def my_gen():
    print("step 1")
    yield 10
    print("step 2")
    yield 20

g = my_gen()   # Nothing prints — body hasn't run yet.
next(g)        # Prints "step 1", returns 10. Pauses at first yield.
next(g)        # Prints "step 2", returns 20. Pauses at second yield.
next(g)        # Raises StopIteration — no more yields.
```

Think of `yield` as a **pause-and-hand-back** instruction. Execution runs up to `yield`, hands the value out, and then **freezes** — all local variables and which line is next are preserved. On the next `next()` call, execution resumes exactly where it froze.

---

### 2. A generator is not a list

| | List | Generator |
|---|---|---|
| All values in memory at once | Yes | No — one at a time |
| Can be iterated more than once | Yes | No — single pass |
| Knows its length | Yes | No |

A generator is **lazy**: it produces each value only when asked. `list()`, `for` loops, and `.extend()` all consume a generator by calling `next()` under the hood until `StopIteration` is raised.

---

### 3. Walking through your specific code

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild
```

This can yield **zero, one, or two** values depending on the conditions.

**In the caller:**

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

1. `_get_child_candidates(...)` is called — a generator object is returned instantly. **No code inside the function has run yet.**
2. `.extend(generator)` starts consuming it by calling `next()` repeatedly:
   - The generator runs to the first `yield`. If the left-child condition is true, it yields `self._leftchild` and freezes. `.extend()` appends it to `candidates`.
   - `.extend()` calls `next()` again. The generator resumes, runs to the second `yield`. If the right-child condition is true, it yields `self._rightchild`.
   - `.extend()` calls `next()` a third time. The function body ends with no more `yield` statements — `StopIteration` is raised and `.extend()` stops.
3. `candidates` now has 0–2 new child nodes appended.

Each call to `_get_child_candidates` creates a **fresh, independent generator** with its own frozen state. The `while` loop terminates when `candidates` is empty — i.e., no node produced children that passed the distance conditions.

**What is never created:** a temporary `[leftchild, rightchild]` list. The generator hands nodes directly to `.extend()` one at a time.

---

### 4. Why reach for `yield` instead of `return [...]`?

- **Memory efficiency.** No throwaway list is built. For two items this barely matters, but the pattern scales — imagine yielding lines from a 10 GB file one at a time.
- **Early termination is free.** If the caller breaks out early, the remaining work is simply never done. A list-returning function always does all the work upfront.
- **Composability.** Generators chain cleanly — one can feed another, building lazy pipelines with no intermediate allocations.
- **Simpler stateful iteration.** Compared to writing a class with `__iter__`/`__next__`, a generator function expresses the same logic in far less code.

**Rule of thumb:** reach for `yield` when you're producing a sequence of values one at a time and either don't need them all in memory at once, or want to let the caller decide how many to consume.