<!-- after / electron-pro / so-509211-python-slice-notation / run 3 -->

**Duration**: 28.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a full breakdown of Python's slice notation:

---

## Python Slice Notation: `a[start:stop:step]`

A slice selects a subsequence from a list, string, tuple, or other sequence. The three parts are always in that fixed order, separated by colons.

### The three parts

| Part | Default (positive step) | Default (negative step) | Meaning |
|------|------------------------|-------------------------|---------|
| `start` | `0` | last index | First element **included** |
| `stop` | `len(a)` | before index `0` | First element **excluded** |
| `step` | `1` | `1` | How far to advance each time |

The slice collects every element at index `start, start+step, start+2*step, ...` stopping **before** `stop`.

---

### Negative values

**Negative index** (start or stop): counts from the end.
- `-1` is the last element, `-2` is second-to-last, etc.
- The mapping is `index + len(a)`, so for a 5-element list, `-1` → `4`.

**Negative step**: traversal runs **right to left**.
- Defaults flip: `start` defaults to the last element, `stop` defaults to before index `0`.
- `a[::-1]` is the idiomatic way to reverse a sequence.

Out-of-range indices are **silently clamped** — `a[0:9999]` on a 5-element list just gives the whole list.

---

### Worked example

```python
a = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
#     0    1    2    3    4    5    6      (positive indices)
#    -7   -6   -5   -4   -3   -2   -1     (negative indices)

a[2:5]      # ['c', 'd', 'e']   — indices 2, 3, 4 (stop=5 excluded)
a[2:5:2]    # ['c', 'e']        — indices 2, 4 (step skips 3)
a[:3]       # ['a', 'b', 'c']   — start defaults to 0
a[4:]       # ['e', 'f', 'g']   — stop defaults to end
a[:]        # ['a', 'b', 'c', 'd', 'e', 'f', 'g']  — full copy
a[::2]      # ['a', 'c', 'e', 'g']  — every other element
a[1::2]     # ['b', 'd', 'f']       — every other, starting at index 1
a[-3:]      # ['e', 'f', 'g']   — last 3 elements
a[:-2]      # ['a', 'b', 'c', 'd', 'e']  — all but last 2
a[::-1]     # ['g', 'f', 'e', 'd', 'c', 'b', 'a']  — reversed
a[5:2:-1]   # ['f', 'e', 'd']   — right to left, indices 5, 4, 3
```

---

### Mental model for any slice

1. Resolve negative indices by adding `len(a)`.
2. Determine the direction from the sign of `step`.
3. Starting at `start`, take the element, advance by `step`, stop when you reach or pass `stop`.
4. If `start` and `stop` are on the wrong side of each other for the given `step` direction, the result is an **empty list** — no error.

```python
a[5:2]      # []  — step is +1, but stop < start, nothing to collect
a[2:5:-1]   # []  — step is -1, but stop > start, nothing to collect
```