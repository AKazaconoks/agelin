<!-- before / bash-expert / so-509211-python-slice-notation / run 1 -->

**Duration**: 37.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a full breakdown of Python's slice notation:

---

## `a[start:stop:step]`

### The three parts

| Part | Meaning | Default |
|------|---------|---------|
| `start` | First index included | `0` |
| `stop` | First index **excluded** | `len(a)` |
| `step` | How many positions to advance each time | `1` |

---

### Negative values

- **Negative index** — counts from the end: `-1` is the last element, `-2` is second-to-last, etc.
- **Negative step** — walk *backwards* through the sequence.

---

### Omitted parts

```python
a[:]      # full copy — a[0 : len(a) : 1]
a[2:]     # from index 2 to the end
a[:5]     # from the start up to (not including) index 5
a[::2]    # every second element
a[::-1]   # reversed
```

---

### Worked example

```python
numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
#          0  1  2  3  4  5  6  7  8  9    (positive indices)
#        -10 -9 -8 -7 -6 -5 -4 -3 -2 -1   (negative indices)

numbers[2:7]     # [2, 3, 4, 5, 6]   — indices 2,3,4,5,6 (stop=7 excluded)
numbers[1:8:2]   # [1, 3, 5, 7]      — every 2nd element from 1 to 7
numbers[-3:]     # [7, 8, 9]         — last 3 elements
numbers[:-2]     # [0,1,2,3,4,5,6,7] — all but last 2
numbers[8:2:-2]  # [8, 6, 4]         — backwards from 8, stopping before 2
numbers[::-1]    # [9,8,7,6,5,4,3,2,1,0] — full reversal
```

---

### Mental model for why `stop` is exclusive

Think of slice indices as **gaps between elements**, not the elements themselves:

```
 |  0  |  1  |  2  |  3  |  4  |
 ^     ^     ^     ^     ^     ^
pos 0  1     2     3     4     5
```

`a[1:4]` picks everything between gap-1 and gap-4 — that's elements at indices 1, 2, 3. It's the same convention C's `for (i=1; i<4; i++)` uses, and it makes range math clean: `a[:n]` always has exactly `n` elements.

---

### Edge cases

```python
numbers[10:20]  # []          — out-of-bounds is silently clamped
numbers[5:2]    # []          — start > stop with positive step
numbers[::0]    # ValueError  — step cannot be zero
```