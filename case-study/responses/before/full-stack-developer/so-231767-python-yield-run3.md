<!-- before / full-stack-developer / so-231767-python-yield / run 3 -->

**Duration**: 99.6s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 99.59s > 60s

---
Here is the complete breakdown of Python's `yield` keyword and generators:

---

## What `yield` Does

Think of `return` as a one-way door — the function exits and its state is gone. `yield` is a **pause button**: the function hands a value back to the caller, freezes in place (local variables, instruction pointer, everything), and waits. The next time the caller asks for a value, it thaws and continues from exactly where it stopped.

```python
def use_return():
    return 1
    return 2  # Dead code — never reached

def use_yield():
    yield 1
    yield 2  # Reached on the second request
```

---

## Generator Functions and Objects

Any function containing `yield` becomes a **generator function**. Calling it **does not run any code** — it returns a **generator object** immediately:

```python
def simple_gen():
    print("Step A")
    yield 10
    print("Step B")
    yield 20

gen = simple_gen()   # Nothing prints. No code runs yet.
print(next(gen))     # Prints "Step A", returns 10
print(next(gen))     # Prints "Step B", returns 20
print(next(gen))     # Raises StopIteration — exhausted
```

`for` loops, `list()`, and `extend()` call `next()` internally until `StopIteration` is raised.

---

## Walking Through Your Code

```python
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild
```

When `candidates.extend(node._get_child_candidates(...))` runs:

1. **The call** — no body code runs; a fresh generator object is returned.
2. **`extend` drives it** — calls `next()` repeatedly.
3. **First `if`** — if true, yields `self._leftchild`; `extend` appends it. Generator **pauses**.
4. **`extend` calls `next()` again** — generator resumes at the second `if`.
5. **Second `if`** — if true, yields `self._rightchild`; `extend` appends it.
6. **Function body ends** — `StopIteration` is raised automatically; `extend` stops.

| Left condition | Right condition | Elements yielded |
|---|---|---|
| False | False | 0 |
| True | False | 1 |
| False | True | 1 |
| True | True | 2 |

The outer `while candidates:` loop ends when no nodes yield any children — leaf nodes or nodes outside the search range.

---

## State Preservation

When a generator yields, Python saves the **entire execution frame** — all local variables and the exact bytecode instruction pointer — inside the generator object on the heap. Nothing is lost. On the next `next()` call, execution resumes as if it never paused.

---

## Why Use `yield` Over a List?

**Memory efficiency** — a list materializes all elements before returning. A generator produces one at a time, on demand:

```python
# 1,000,000 integers in memory before first element is usable
def big_list():
    return [x * 2 for x in range(1_000_000)]

# Produces one at a time, memory usage stays constant
def big_gen():
    for x in range(1_000_000):
        yield x * 2
```

**Lazy evaluation** — ideal for infinite sequences, expensive computations, or pipeline composition.

**Simpler stateful code** — expressing multi-step, stateful iteration as straight-line code, instead of a class with `__iter__`/`__next__` boilerplate.

---

## Concrete Example — Fibonacci Generator

```python
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b  # Runs after resuming from the yield above

gen = fibonacci()
first_ten = [next(gen) for _ in range(10)]
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

print(next(gen))  # 55 — resumes from where first_ten left off
```

The `while True` is safe here because the caller controls when to stop pulling values. The two variables `a` and `b` are all the storage needed for an infinite sequence.

---

**In summary:** `yield` turns a function into a lazy, stateful value producer. Each call to the generator function gives you a fresh generator object. `extend()` (and `for` loops) consume it by pulling values one at a time until the function body ends. The key benefits are constant memory usage and the ability to express complex iteration logic as simple, readable code.