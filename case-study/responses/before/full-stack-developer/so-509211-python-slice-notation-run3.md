<!-- before / full-stack-developer / so-509211-python-slice-notation / run 3 -->

**Duration**: 35.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough breakdown of Python slice notation:

---

## Python Slice Notation: `a[start:stop:step]`

### The Three Parts

| Part | Meaning | Default |
|------|---------|---------|
| `start` | Index of the **first** element to include | `0` (beginning) |
| `stop` | Index of the **first** element to **exclude** | `len(a)` (end) |
| `step` | How many positions to advance each time | `1` |

**Key rule:** `stop` is always **exclusive**. `a[1:4]` gives indices 1, 2, 3 — not 4.

---

### Negative Values

**Negative indices** count backwards from the end. `-1` is the last element, `-2` is second-to-last, etc.

```python
a = [10, 20, 30, 40, 50]
#    -5  -4  -3  -2  -1

a[-3:]    # [30, 40, 50]  — last 3 elements
a[-3:-1]  # [30, 40]      — 3rd-to-last up to (not including) last
a[1:-1]   # [20, 30, 40]  — drop first and last
```

**Negative step** means iterate **backwards**. When `step` is negative, the defaults for `start`/`stop` reverse — `start` defaults to the last element, `stop` defaults to before the first element.

```python
a[::-1]    # [50, 40, 30, 20, 10]  — full reversal
a[4:1:-1]  # [50, 40, 30]          — from index 4 down to (not including) 1
```

---

### Omitting Parts

```python
a[:]      # entire sequence (start=0, stop=end, step=1)
a[2:]     # from index 2 to end
a[:3]     # from start up to (not including) index 3
a[::2]    # every 2nd element
a[::-1]   # entire sequence reversed
```

---

### Worked Example

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

# Basic
a[2:5]      # [2, 3, 4]
a[:4]       # [0, 1, 2, 3]
a[6:]       # [6, 7, 8, 9]

# Step
a[::2]      # [0, 2, 4, 6, 8]  — every 2nd element
a[1::2]     # [1, 3, 5, 7, 9]  — every 2nd, starting at index 1
a[::3]      # [0, 3, 6, 9]     — every 3rd element

# Negative indices
a[-3:]      # [7, 8, 9]        — last 3
a[:-3]      # [0,1,2,3,4,5,6]  — all but last 3
a[-5:-2]    # [5, 6, 7]

# Negative step
a[::-1]     # [9,8,7,6,5,4,3,2,1,0]
a[7:2:-1]   # [7, 6, 5, 4, 3]
```

---

### Common Gotcha

If `step` is negative you must have `start > stop`, otherwise Python silently returns an empty list:

```python
a[2:7:-1]  # []  — start < stop with negative step: nothing to iterate
```

**Mental model:** ask three questions — *Where do I start? Where do I stop (exclusive)? How do I walk (direction and stride)?*