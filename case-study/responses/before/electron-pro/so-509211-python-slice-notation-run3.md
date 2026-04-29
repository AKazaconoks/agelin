<!-- before / electron-pro / so-509211-python-slice-notation / run 3 -->

**Duration**: 35.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough breakdown of Python slice notation:

---

## Python Slice Notation: `a[start:stop:step]`

Slicing extracts a subsequence from any sequence type (list, string, tuple, etc.) without an explicit loop.

---

### 1. The Three Parts

| Part | Meaning |
|---|---|
| `start` | Index of the first element to **include** |
| `stop` | Index of the first element to **exclude** (slice stops *before* this) |
| `step` | How many positions to advance between picks |

The key insight: **`stop` is exclusive**. `a[2:5]` gives you indices 2, 3, 4 — not 5.

---

### 2. Negative Values

**Negative `start` or `stop`** count from the end: `-1` is the last element, `-2` is second-to-last, etc.

```
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
     ↑                             ↑
  index 0                      index -1
```

**Negative `step`** reverses the direction of traversal. When step is negative, the defaults for `start`/`stop` also flip (start defaults to the last element, stop defaults to before the first), so `a[::-1]` naturally covers the whole sequence in reverse.

---

### 3. Omitted Parts and Their Defaults

| Expression | `start` | `stop` | `step` |
|---|---|---|---|
| `a[:]` | 0 | end | 1 |
| `a[::2]` | 0 | end | 2 |
| `a[::-1]` | last | before first | -1 |
| `a[2:]` | 2 | end | 1 |
| `a[:5]` | 0 | 5 | 1 |

Out-of-bounds indices are **silently clamped** rather than raising an error — `a[0:999]` on a 10-element list just returns all 10 elements.

---

### 4. Worked Examples

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

# Basic slices
a[2:6]      # [2, 3, 4, 5]
a[:4]       # [0, 1, 2, 3]
a[7:]       # [7, 8, 9]
a[:]        # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]  (shallow copy)

# Using step
a[::2]      # [0, 2, 4, 6, 8]    every other element
a[1::2]     # [1, 3, 5, 7, 9]    every other, starting at index 1
a[1:8:2]    # [1, 3, 5, 7]       every other between indices 1 and 7

# Negative indices
a[-3:]      # [7, 8, 9]           last 3 elements
a[:-3]      # [0, 1, 2, 3, 4, 5, 6]  everything except last 3
a[-5:-2]    # [5, 6, 7]

# Negative step (reversal)
a[::-1]     # [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
a[7:2:-1]   # [7, 6, 5, 4, 3]    from index 7 down to (not including) 2
a[::-2]     # [9, 7, 5, 3, 1]
```

---

### Mental Model

Think of indices as the **gaps between elements**, not the elements themselves:

```
 [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9 ]
 ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^
 0  1  2  3  4  5  6  7  8  9  10   ← positive gaps
-10 -9 -8 -7 -6 -5 -4 -3 -2 -1     ← negative gaps
```

`a[2:7]` picks everything between gap 2 and gap 7 — elements at indices 2, 3, 4, 5, 6. This is why `stop` is exclusive and why out-of-bounds values clamp gracefully: you are pointing at a boundary, not demanding a specific element exist there.