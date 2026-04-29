<!-- after / full-stack-developer / so-231767-python-yield / run 3 -->

**Duration**: 50.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough explanation of `yield` and generators in Python.

---

## What `yield` does

When Python sees `yield` inside a function, it transforms that function into a **generator function**. Calling a generator function does **not** run its body — it returns a **generator object**. The body only runs when something iterates over that object, one `yield` at a time.

---

## What happens in your specific code

```python
candidates.extend(node._get_child_candidates(distance, min_dist, max_dist))
```

Calling `_get_child_candidates(...)` returns a **generator object** immediately — no code inside the function has run yet.

`extend` then **iterates** that generator. Only at that point does the function body start executing, pausing at each `yield` to hand a value to `extend`, then resuming when `extend` asks for the next one.

Depending on the conditions, the generator yields:
- **0 values** — both `if` conditions are false, the function body falls through
- **1 value** — only one `if` is true
- **2 values** — both `if` conditions are true

### Stepping through execution (both conditions true)

```
extend asks for first value
  → function body starts running
  → first if: True → yield self._leftchild   # pause, hand leftchild to extend
extend asks for second value
  → resumes after first yield
  → second if: True → yield self._rightchild # pause, hand rightchild to extend
extend asks for third value
  → resumes, no more yields, function ends
  → StopIteration raised internally → extend stops
```

The generator is **not called again**. One call produces one generator object, iterated to exhaustion by `extend` in a single pass. The `while candidates:` loop then pops the next node and calls `_get_child_candidates` again, producing a **fresh** generator for that node.

---

## `yield` vs. `return` — side by side

```python
# List version
def _get_child_candidates(self, distance, min_dist, max_dist):
    result = []
    if self._leftchild and distance - max_dist < self._median:
        result.append(self._leftchild)
    if self._rightchild and distance + max_dist >= self._median:
        result.append(self._rightchild)
    return result

# Generator version (the original)
def _get_child_candidates(self, distance, min_dist, max_dist):
    if self._leftchild and distance - max_dist < self._median:
        yield self._leftchild
    if self._rightchild and distance + max_dist >= self._median:
        yield self._rightchild
```

The observable result for the caller is identical — `extend` handles both a list and a generator the same way. The difference is _when_ and _how_ values are produced:

| | List version | Generator version |
|---|---|---|
| Return type | `list` | generator object |
| Values computed | All upfront | One at a time, on demand |
| Memory | Allocates a list | No list allocated |
| Function body runs when? | On call | On iteration |

---

## Why reach for `yield`?

**1. Memory efficiency.** A generator never materializes the full result set. Reading a multi-gigabyte file line by line with `yield line` costs constant memory regardless of file size. `return lines` would load everything first.

**2. Lazy evaluation.** Values are computed only when asked for. If the caller stops early, the rest of the generator never runs:

```python
match = next((x for x in huge_list if x > 1000), None)
# Stops after finding the first match — never processes the rest
```

**3. Composable pipelines.** Generators chain naturally without intermediate lists:

```python
lines    = read_lines(filename)        # generator
stripped = (l.strip() for l in lines)  # generator
nonempty = (l for l in stripped if l)  # generator
# Nothing has run yet — file hasn't even been read.
for line in nonempty:                  # runs one line at a time
    process(line)
```

**4. Infinite sequences.** A generator can yield forever — impossible with a list:

```python
def integers_from(n):
    while True:
        yield n
        n += 1
```

---

## The mental model

Think of `yield` as a **pause button with a return value**. Each time the caller asks for the next item, the function resumes from the exact line after the last `yield`, runs until it hits the next `yield` (hands that value over and pauses), or falls off the end of the function (signals iteration is done).

The function's **local variables and execution position** are preserved across pauses — that is what makes a generator fundamentally different from an ordinary function call.