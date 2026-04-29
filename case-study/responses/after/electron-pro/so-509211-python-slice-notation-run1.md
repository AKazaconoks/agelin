<!-- after / electron-pro / so-509211-python-slice-notation / run 1 -->

**Duration**: 39.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a complete walkthrough of Python's slice notation:

---

## Python Slice Notation: `a[start:stop:step]`

A slice selects a subsequence from any sequence (`list`, `str`, `tuple`, etc.). All three parts are optional.

---

### The three parts

**`step`** — how far to advance after each selected element, and which direction to travel.
- Default: `1` (left to right, every element)
- Negative step: travel right to left
- `0` is illegal — raises `ValueError`

**`start`** — the index of the first element to include.
- Default: beginning of the sequence in the direction of travel (`0` for positive step, `-1` for negative step)

**`stop`** — where to stop, **exclusive** — the element at `stop` is never included.
- Default: end of the sequence in the direction of travel

---

### Negative indices

A negative index `i` is equivalent to `len(a) + i`:

| Written | Resolves to (for a 6-element list) |
|---------|------------------------------------|
| `-1`    | `5` (last)                         |
| `-2`    | `4`                                |
| `-6`    | `0` (first)                        |

Out-of-bounds indices are **silently clamped** — unlike direct indexing, `a[0:1000]` just returns the whole list.

---

### What "omitted" means in practice

| Syntax    | Equivalent to (positive step)                      |
|-----------|----------------------------------------------------|
| `a[:]`    | `a[0 : len(a) : 1]`                               |
| `a[2:]`   | `a[2 : len(a) : 1]`                               |
| `a[:4]`   | `a[0 : 4 : 1]`                                    |
| `a[::2]`  | `a[0 : len(a) : 2]`                               |
| `a[::-1]` | full sequence reversed (start = last, stop = before first) |

---

### Worked example

```python
a = ['A', 'B', 'C', 'D', 'E', 'F']
#     0    1    2    3    4    5      <- positive indices
#    -6   -5   -4   -3   -2   -1     <- negative indices

a[:]        # ['A','B','C','D','E','F']  — full copy
a[1:4]      # ['B','C','D']             — indices 1,2,3 (4 excluded)
a[::2]      # ['A','C','E']             — every other, starting at 0
a[1::2]     # ['B','D','F']             — every other, starting at 1
a[::-1]     # ['F','E','D','C','B','A'] — reversed
a[4:1:-1]   # ['E','D','C']             — right to left, stopping before index 1
a[-2:]      # ['E','F']                 — last two elements
a[:-2]      # ['A','B','C','D']         — everything except last two
a[-4:-1]    # ['C','D','E']             — negative start and stop
```

**Trickiest one unpacked — `a[4:1:-1]`:**
- Start at index `4` → `'E'`
- Step `-1`: move left
- Stop *before* reaching index `1` → include indices 4, 3, 2 — exclude 1
- Result: `['E', 'D', 'C']`

---

### Key rules to internalize

1. `stop` is always **exclusive**, regardless of direction.
2. A **negative step** flips the defaults for `start` (end of sequence) and `stop` (before the beginning). Always figure out direction first.
3. Out-of-bounds `start`/`stop` values are **silently clamped** — never an error.
4. The result is always a **new object** of the same type (for built-in sequences), not a view — unlike NumPy arrays.