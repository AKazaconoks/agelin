<!-- before / full-stack-developer / so-231767-python-yield / run 2 -->

**Duration**: 79.1s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 79.14s > 60s

---
Here's a thorough breakdown of `yield` and generators:

---

## What `yield` Does

When Python sees `yield` inside a function, it transforms that function into a **generator function**. Calling it does **not** execute the body — it immediately returns a **generator object**. The body only runs when you iterate over that object, one `yield` at a time.

Think of a generator as a **paused machine**: each time you ask for the next value, it resumes from exactly where it left off, runs until the next `yield`, hands that value out, and **pauses again** — preserving all local state in between.

```python
def simple_generator():
    print("Step 1")
    yield 10
    print("Step 2")
    yield 20

gen = simple_generator()  # Nothing prints yet. Body has NOT run.

print(next(gen))  # Prints "Step 1", yields 10
print(next(gen))  # Prints "Step 2", yields 20
print(next(gen))  # Raises StopIteration
```

---

## What Happens in Your Code

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild
```

**Step A — The call returns immediately.**
`node._get_child_candidates(distance, min_dist, max_dist)` returns a generator object instantly. No condition is evaluated yet.

**Step B — `candidates.extend(...)` pulls values out of it.**
`list.extend()` accepts any iterable — including a generator. It calls `next()` repeatedly until `StopIteration`:
1. Body runs to the first `if` — if true, yields `self._leftchild`, pauses.
2. Body resumes, evaluates the second `if` — if true, yields `self._rightchild`, pauses.
3. Body falls off the end → `StopIteration` → `extend` stops.

So depending on the node's state, this generator yields **zero, one, or two** children — and it's consumed entirely within that single `candidates.extend(...)` call.

---

## What Is Actually Returned

Not a list. Not a single element. A **generator object** (`<class 'generator'>`). It:
- Holds a reference to the function body and all local variables
- Knows exactly where execution is paused
- Produces values one at a time, only when asked

---

## When Does It Stop?

A generator is exhausted in two situations:
1. **The function body runs off the end** (as in `_get_child_candidates` — no explicit `return` needed)
2. **An explicit `return` statement is hit**

---

## Why Use `yield` Instead of Returning a List?

**Memory efficiency.** A list-returning version must build the full result before returning anything. A generator produces values one at a time — never allocating the full result set. For 10 million items, the difference is enormous.

**No wasted computation.** If the caller stops early (`break`, exception, etc.), a generator simply never runs the code for the remaining values.

**Composable pipelines.** Generators chain elegantly — each stage stays lazy:

```python
lines     = read_lines("big_file.txt")
stripped  = (line.strip() for line in lines)
non_empty = (line for line in stripped if line)
# Nothing has been read from disk yet — only when you consume `non_empty`
```

**Cleaner code.** No temporary list to create, populate, and return.

---

## The Mental Model in One Sentence

> `yield` doesn't mean "return this and be done" — it means "hand this value to the caller right now, then **wait here** until they ask for the next one."