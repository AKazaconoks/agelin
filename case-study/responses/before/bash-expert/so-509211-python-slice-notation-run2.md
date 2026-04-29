<!-- before / bash-expert / so-509211-python-slice-notation / run 2 -->

**Duration**: 46.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough breakdown of Python slice notation, as explained by the agent:

---

## Python Slice Notation: `a[start:stop:step]`

### The Three Parts

| Part | Meaning | Default (positive step) | Default (negative step) |
|------|---------|------------------------|------------------------|
| **start** | First index included (inclusive) | `0` | `len(a) - 1` (end) |
| **stop** | First index excluded (exclusive) | `len(a)` (end) | `-1` (before beginning) |
| **step** | Jump size between indices | `1` | — |

Step cannot be `0` — that raises a `ValueError`.

---

### Negative Values

- **Negative start/stop**: Count from the end. `-1` is the last element, `-2` is second-to-last, etc. For a sequence of length `n`, index `-k` equals `n - k`.
- **Negative step**: Reverses direction. When step is negative, `start` should be greater than `stop`, and the defaults flip (start = last element, stop = before the first).

---

### Worked Example

```python
my_list = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
#  index:   0    1    2    3    4    5    6
#           -7   -6   -5   -4   -3   -2   -1
```

**Basic slices:**
```python
my_list[1:4]    # ['b', 'c', 'd']   — index 1 up to (not including) 4
my_list[2:]     # ['c', 'd', 'e', 'f', 'g']   — index 2 to end
my_list[:3]     # ['a', 'b', 'c']   — start to (not including) 3
my_list[:]      # ['a', 'b', 'c', 'd', 'e', 'f', 'g']   — full copy
```

**With step:**
```python
my_list[::2]    # ['a', 'c', 'e', 'g']   — every 2nd element
my_list[1::2]   # ['b', 'd', 'f']        — every 2nd, starting at index 1
my_list[1:6:2]  # ['b', 'd', 'f']        — every 2nd, from index 1 to 5
```

**Negative indices:**
```python
my_list[-3:]    # ['e', 'f', 'g']   — last 3 elements
my_list[:-2]    # ['a', 'b', 'c', 'd', 'e']   — all but last 2
my_list[-4:-1]  # ['d', 'e', 'f']   — 4th-from-end to 2nd-from-end
```

**Negative step (reverse):**
```python
my_list[::-1]   # ['g', 'f', 'e', 'd', 'c', 'b', 'a']   — full reverse
my_list[5:2:-1] # ['f', 'e', 'd']   — from index 5 down to 3
my_list[::-2]   # ['g', 'e', 'c', 'a']   — every 2nd element, reversed
```

---

### Key Rules to Remember

1. **stop is always exclusive** — `a[1:4]` gives elements at indices 1, 2, 3 (not 4).
2. **Out-of-bounds indices are silently clipped** — `a[0:999]` just gives the whole list.
3. **`a[:]` is a shallow copy**, not the original object.
4. **Negative step flips the defaults** for start and stop — when you write `a[::-1]`, Python internally sets start to the last index and stop to "before index 0".