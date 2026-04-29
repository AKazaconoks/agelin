<!-- after / bash-expert / so-509211-python-slice-notation / run 3 -->

**Duration**: 29.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a complete breakdown of Python's slice notation `a[start:stop:step]`:

---

## The Three Parts

| Part | Meaning | Default (positive step) | Default (negative step) |
|------|---------|------------------------|------------------------|
| `start` | First index to include | `0` | `-1` (end of list) |
| `stop` | First index to **exclude** | `len(a)` | before the beginning |
| `step` | Gap between each picked index | `1` | — |

---

## Worked Example

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
#    0  1  2  3  4  5  6  7  8  9   (positive indices)
#  -10 -9 -8 -7 -6 -5 -4 -3 -2 -1  (negative indices)
```

**Basic slices**
```python
a[2:7]    # [2, 3, 4, 5, 6]  — indices 2,3,4,5,6 (7 excluded)
a[:4]     # [0, 1, 2, 3]     — start defaults to 0
a[6:]     # [6, 7, 8, 9]     — stop defaults to end
a[:]      # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]  — full copy
```

**With step**
```python
a[::2]    # [0, 2, 4, 6, 8]  — every 2nd element
a[1::2]   # [1, 3, 5, 7, 9]  — every 2nd, starting at 1
a[2:8:2]  # [2, 4, 6]        — every 2nd, between indices 2 and 8
```

**Negative indices** (count from the end)
```python
a[-3:]    # [7, 8, 9]         — last 3 elements
a[:-2]    # [0, 1, 2, 3, 4, 5, 6, 7]  — all but last 2
a[-5:-1]  # [5, 6, 7, 8]      — 5th-from-end up to (not including) last
```

**Negative step** (walk backwards — swap the meaning of start/stop)
```python
a[::-1]   # [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]  — reverse the list
a[7:2:-1] # [7, 6, 5, 4, 3]   — from index 7 down to (not including) 2
a[::-2]   # [9, 7, 5, 3, 1]   — every 2nd element, backwards
```

---

## Key Rules to Remember

1. **`stop` is always excluded** — `a[2:5]` gives indices 2, 3, 4.
2. **Out-of-bounds never raises** — `a[0:999]` just gives everything available.
3. **For negative step, start must be > stop** to get anything back; otherwise you get `[]`.
4. **Omitting a part** replaces it with `None`, which Python resolves to the sensible default for the given step direction.