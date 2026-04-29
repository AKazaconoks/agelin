<!-- before / electron-pro / so-231767-python-yield / run 2 -->

**Duration**: 74.9s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 74.91s > 60s

---
Here is a thorough explanation of `yield`:

---

## The Core Idea

Any function containing `yield` is a **generator function**. Calling it does _not_ execute the body — it returns a **generator object**, a paused, stateful iterator that runs the body on demand.

`yield` does two things at once:
1. **Produces a value** — hands it to whatever is consuming the generator.
2. **Suspends execution** — freezes the function's entire state (locals, current line) and waits for the next request.

---

## Step-by-Step Through Your Code

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild
```

**When you call `node._get_child_candidates(...)`:**
- The function body has **not run a single line yet**.
- You get back a generator object immediately.

**When `candidates.extend(...)` consumes it:**
- `extend()` accepts any iterable — it loops over the generator, pulling values.
- The function runs until the first `yield`, hands out `self._leftchild`, then **freezes**.
- On the next pull, it resumes from that freeze point, evaluates the second `if`, and either yields `self._rightchild` or doesn't.
- When the function body ends with no more `yield`s reachable, the generator is **exhausted** — `extend()` stops.

So `_get_child_candidates` yields **zero, one, or two values** depending on which conditions are true. Not a list. Not a single element. A live object that produces values lazily.

---

## How the Caller Uses It

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

`list.extend()` accepts any iterable. The generator is an iterable. `extend()` pulls each yielded child and appends it to `candidates`. The generator acts as a **conditional filter** — it only hands over children whose subtrees could contain valid results (spatial pruning logic). If neither child qualifies, nothing is added.

---

## Why Reach for `yield` Instead of Returning a List?

The equivalent without `yield`:

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    result = []
    if self._leftchild and distance - max_dist < self._median:
        result.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        result.append(self._rightchild)
    return result
```

This works, but `yield` gives you:

| Benefit | Why it matters |
|---|---|
| **No intermediate allocation** | No temp list created just to be consumed immediately |
| **Lazy evaluation** | Values computed only when asked — if the consumer stops early, remaining work is never done |
| **Infinite sequences** | A generator can model an endless stream; a list cannot |
| **Cleaner code** | Reads as a direct statement of intent — "produce this if condition holds" — no accumulator boilerplate |

---

## Summary

| Question | Answer |
|---|---|
| What does `yield` do? | Produces a value and suspends the function, preserving all state until the next value is requested |
| What does calling `_get_child_candidates` return? | A generator object — the function body has not run yet |
| How does `candidates.extend()` consume it? | `extend()` accepts any iterable; it pulls each yielded value in turn |
| When does it stop? | When the function body ends with no more reachable `yield` statements |
| Why use it? | Lazy evaluation: no upfront allocation, values on demand, and cleaner conditional-output code |

The deeper insight: `yield` lets you write code that **looks like a straightforward top-to-bottom function** while behaving as an on-demand value source — the readability of sequential logic with the efficiency of lazy computation.