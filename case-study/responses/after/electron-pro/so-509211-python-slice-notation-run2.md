<!-- after / electron-pro / so-509211-python-slice-notation / run 2 -->

**Duration**: 50.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete breakdown of Python slice notation:

---

## Python Slice Notation: `a[start:stop:step]`

A slice returns a **new sequence** containing selected elements. All three parts are optional.

---

### 1. The Three Parts

**`start`** — inclusive. The element at this index *is* included.

**`stop`** — exclusive. The element at this index *is not* included. The slice goes *up to but not including* `stop`. This asymmetry is intentional: `a[2:5]` gives exactly 3 elements (2, 3, 4), and `len(a[2:5]) == 5 - 2`.

**`step`** — how many positions to advance after each element. Default is `1`. A step of `2` takes every other element, etc.

---

### 2. Negative Values

**Negative `start` or `stop`** — count from the right end. Index `-1` is the last element, `-2` is second-to-last, and so on.

```
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    -10 -9 -8 -7 -6 -5 -4 -3 -2 -1   ← negative indices
      0  1  2  3  4  5  6  7  8  9   ← positive indices
```

**Negative `step`** — traverse *backwards*. When step is negative, the default `start` becomes the last element and the default `stop` becomes before the first element. This is why `a[::-1]` reverses a sequence.

---

### 3. Omitting Parts

| Expression | `start` default | `stop` default | `step` default |
|------------|-----------------|----------------|----------------|
| `a[:]`     | beginning       | end            | 1              |
| `a[2:]`    | `2`             | end            | 1              |
| `a[:5]`    | beginning       | `5`            | 1              |
| `a[::2]`   | beginning       | end            | 2              |
| `a[::-1]`  | last element    | before first   | -1             |

Python also **clamps out-of-range indices silently** — `a[0:9999]` just gives you the whole list (unlike `a[9999]`, which raises `IndexError`).

---

### 4. Worked Examples

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

# Basic slicing
a[2:5]       # [2, 3, 4]       — start at 2, stop before 5
a[:4]        # [0, 1, 2, 3]    — stop before 4
a[6:]        # [6, 7, 8, 9]    — start at 6, go to end
a[:]         # [0, ..., 9]     — full shallow copy

# Using step
a[::2]       # [0, 2, 4, 6, 8] — every 2nd element
a[1::2]      # [1, 3, 5, 7, 9] — every 2nd, starting at index 1
a[1:8:2]     # [1, 3, 5, 7]    — indices 1–7, every 2nd

# Negative indices
a[-3:]       # [7, 8, 9]       — last 3 elements
a[:-3]       # [0, 1, ..., 6]  — all but last 3
a[-5:-2]     # [5, 6, 7]       — fifth-to-last up to third-to-last

# Negative step (reverse traversal)
a[::-1]      # [9, 8, ..., 0]  — full reversal
a[7:2:-1]    # [7, 6, 5, 4, 3] — from index 7 backwards, stop before 2
a[::-2]      # [9, 7, 5, 3, 1] — every 2nd in reverse
```

---

### 5. Mental Model for Any Slice

When reading `a[x:y:z]`, ask:
1. **Direction?** Positive (or omitted) `z` → left-to-right. Negative `z` → right-to-left.
2. **Where do I start?** Index `x` (from the right if negative). If omitted, the natural starting end for that direction.
3. **Where do I stop?** *Before* index `y`. If omitted, go to the natural ending end.
4. **What do I pick up?** Take the element at `x`, advance `|z|` steps in the chosen direction, repeat until you would reach or pass `y`.

The two rules to keep front-of-mind: **stop is exclusive**, and **a negative step reverses the defaults**.