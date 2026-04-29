<!-- after / bash-expert / so-509211-python-slice-notation / run 2 -->

**Duration**: 28.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough breakdown of Python's slice notation:

---

## `a[start:stop:step]` — The Three Parts

| Part | Meaning | Default (forward) | Default (reverse) |
|------|---------|-------------------|-------------------|
| `start` | First index to include (inclusive) | `0` | last index |
| `stop` | First index to exclude (exclusive) | `len(a)` | before first element |
| `step` | Stride between picks | `1` | — |

---

## Omitting Parts

- `a[:]` — entire sequence
- `a[2:]` — from index 2 to the end
- `a[:5]` — from the start up to (but not including) index 5
- `a[::2]` — every other element
- `a[::-1]` — entire sequence reversed

---

## Negative Values

**Negative indices** count from the end: `-1` is the last element, `-2` is second-to-last, etc.

**Negative step** reverses direction — start/stop defaults flip accordingly, which is what makes `a[::-1]` work.

---

## Worked Example

```python
a = ['A', 'B', 'C', 'D', 'E', 'F']
#     0    1    2    3    4    5      (positive indices)
#    -6   -5   -4   -3   -2   -1      (negative indices)

a[1:4]      # ['B', 'C', 'D']       — indices 1, 2, 3
a[::2]      # ['A', 'C', 'E']       — every other, starting at 0
a[1::2]     # ['B', 'D', 'F']       — every other, starting at 1

a[-3:-1]    # ['D', 'E']            — 3rd-from-last up to (not including) last
a[2:-1]     # ['C', 'D', 'E']       — index 2 through second-to-last

a[::-1]     # ['F', 'E', 'D', 'C', 'B', 'A']  — reversed
a[4:1:-1]   # ['E', 'D', 'C']       — from index 4 down to index 2 (stop=1 excluded)
```

---

## The One Rule to Remember

> **`stop` is always exclusive** — whether stepping forward or backward.

In `a[1:4]` you get indices 1, 2, 3 (not 4). In `a[4:1:-1]` you get indices 4, 3, 2 (not 1). That single rule, combined with knowing which direction `step` points and how negatives wrap around, covers essentially every slice you'll encounter.