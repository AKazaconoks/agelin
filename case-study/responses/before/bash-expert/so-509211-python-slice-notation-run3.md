<!-- before / bash-expert / so-509211-python-slice-notation / run 3 -->

**Duration**: 38.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's how Python slice notation works:

---

## `a[start:stop:step]`

All three parts are optional. The slice picks elements starting at `start`, advancing by `step`, and stopping before `stop`.

---

### The three parts

| Part | Meaning | Default (positive step) | Default (negative step) |
|------|---------|------------------------|------------------------|
| `start` | First index, **inclusive** | `0` | `len(a) - 1` (last element) |
| `stop` | Boundary, **exclusive** | `len(a)` | before the beginning |
| `step` | How many positions to advance each time | `1` | `-1` |

---

### Negative values

- **Negative start/stop** count from the end: `-1` is the last element, `-2` is second-to-last, etc. Python converts them as `i + len(a)`.
- **Negative step** reverses direction — the slice walks backward. When step is negative, the default `start`/`stop` flip accordingly.
- Out-of-bounds indices are silently clamped, so you won't get an `IndexError` from a slice.

---

### Worked example

```python
data = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
#        0    1    2    3    4    5    6
#       -7   -6   -5   -4   -3   -2   -1
```

| Expression | Result | Explanation |
|-----------|--------|-------------|
| `data[1:4]` | `['B','C','D']` | indices 1, 2, 3 (stop 4 excluded) |
| `data[:3]` | `['A','B','C']` | start defaults to 0 |
| `data[3:]` | `['D','E','F','G']` | stop defaults to end |
| `data[:]` | `['A','B','C','D','E','F','G']` | full shallow copy |
| `data[::2]` | `['A','C','E','G']` | every 2nd element |
| `data[1::2]` | `['B','D','F']` | every 2nd, starting at index 1 |
| `data[2:6:2]` | `['C','E']` | indices 2, 4 |
| `data[-3:-1]` | `['E','F']` | indices 4, 5 (stop -1 = index 6 excluded) |
| `data[2:-2]` | `['C','D','E']` | index 2 up to (not including) index 5 |
| `data[::-1]` | `['G','F','E','D','C','B','A']` | full reverse |
| `data[5:1:-1]` | `['F','E','D','C']` | walk backward from 5 down to (not including) 1 |

---

### Mental model

1. Resolve any negative indices to their positive equivalents.
2. If `step > 0`, start at `start` and walk right, collecting every `step`-th element, stopping before you reach `stop`.
3. If `step < 0`, start at `start` and walk **left**, stopping before you reach `stop`. Because direction flipped, `start` must be greater than `stop` or you get an empty slice.

The stop index is **always excluded**, regardless of direction — just like `range(start, stop, step)`, which slices parallel exactly.