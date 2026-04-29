<!-- after / full-stack-developer / so-231767-python-yield / run 1 -->

**Duration**: 70.3s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 70.32s > 60s

---
Here's the full explanation:

---

## The Short Answer

When you put `yield` inside a function, that function becomes a **generator function**. Calling it does not execute the function body — instead, it returns a **generator object**: a lazy iterator that produces values one at a time, pausing its internal state between each one.

---

## What Happens When `_get_child_candidates` Is Called?

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

Calling `_get_child_candidates(...)` **does not run any code inside the function yet**. Python sees `yield` and immediately returns a generator object — a paused machine that knows how to produce values but hasn't started yet.

`candidates.extend(...)` then drives that machine by iterating the generator, pulling values out one at a time until it's exhausted.

So: **neither a list nor a single element is returned.** A generator object is returned — a lazy sequence that produces values on demand.

---

## How a Generator Object Works

```python
def simple_generator():
    yield 1
    yield 2
    yield 3
```

Iterating this generator proceeds like:

- First `next()`: runs until `yield 1`, pauses, hands back `1`
- Second `next()`: resumes from that point, runs until `yield 2`, pauses, hands back `2`
- Third `next()`: resumes, runs until `yield 3`, hands back `3`
- Fourth `next()`: hits the end of the function, raises `StopIteration` — iteration is done

**The critical insight**: the function's local variables and current line number are preserved between calls. It suspends and resumes.

---

## Walking Through Your Specific Code

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild
```

This can yield zero, one, or two values. Here's the trace:

1. `_get_child_candidates(...)` is called → generator object returned immediately, no code run yet
2. `extend` starts iterating the generator (calls `next()` repeatedly)
3. **First `next()`**: the first `if` is evaluated. If true, `yield self._leftchild` pauses execution and hands `self._leftchild` to `extend`, which appends it to `candidates`
4. **Second `next()`**: resumes after the first yield, evaluates the second `if`. If true, yields `self._rightchild`
5. **Third `next()`**: the function body ends → `StopIteration` → `extend` stops

**Regarding "is it called again?"** — no. `extend` exhausts this one generator object completely, then discards it. A fresh generator is created each time `_get_child_candidates(...)` appears in the loop.

---

## Why Use `yield` Instead of Returning a List?

The list equivalent would be:

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    result = []
    if self._leftchild and distance - max_dist < self._median:
        result.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        result.append(self._rightchild)
    return result
```

For this specific case (at most 2 items), the difference is small. But the general reasons to prefer `yield`:

| Reason | Explanation |
|---|---|
| **Memory efficiency** | A generator holds only its current state; a list materializes everything at once. For thousands of items, this is a huge difference. |
| **Early termination** | If the consumer stops after the first value, the generator does no extra work. A list already computed everything. |
| **Infinite sequences** | A generator can yield forever. A list cannot. |
| **Composability** | Generators chain together without intermediate lists — the foundation of `itertools`. |
| **Clarity** | `yield` expresses "produce a sequence of things" directly, without the build-list-then-return ceremony. |

---

## The Mental Model

A generator function is a **recipe**, not a result. Calling it hands you the recipe card (the generator object), not a cooked meal. Each time something calls `next()` — whether explicitly or implicitly through `for`, `extend`, `list()`, etc. — the recipe executes one more step until it hits a `yield`, hands you that value, and waits. When the recipe runs out of steps, it signals completion via `StopIteration`. The full local state is preserved between steps, which is what makes this fundamentally different from a normal function return.