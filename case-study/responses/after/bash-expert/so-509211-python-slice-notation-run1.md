<!-- after / bash-expert / so-509211-python-slice-notation / run 1 -->

**Duration**: 33.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a full breakdown of Python slice notation:

## `a[start:stop:step]`

### The three parts

| Part | Meaning | Default (positive step) | Default (negative step) |
|------|---------|------------------------|------------------------|
| `start` | First index included | `0` | `len(a) - 1` (last element) |
| `stop` | First index **excluded** | `len(a)` | before index `0` |
| `step` | Stride between picks | `1` | — |

Stop is always **exclusive** — the element at that index is never included.

---

### Negative values

- **Negative index**: counts from the end. `-1` is the last element, `-2` is second-to-last, etc.
- **Negative step**: walks *backward*. `start` must be greater than `stop` or you get an empty slice.

---

### Worked example

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
#    0  1  2  3  4  5  6  7  8  9   <- positive indices
#  -10 -9 -8 -7 -6 -5 -4 -3 -2 -1   <- negative indices
```

```python
a[2:7]      # [2, 3, 4, 5, 6]           — indices 2..6 (7 excluded)
a[2:7:2]    # [2, 4, 6]                 — same range, every 2nd element
a[:5]       # [0, 1, 2, 3, 4]           — start omitted → 0
a[5:]       # [5, 6, 7, 8, 9]           — stop omitted → end
a[:]        # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]  — full shallow copy
a[::2]      # [0, 2, 4, 6, 8]           — every even-indexed element
a[1::2]     # [1, 3, 5, 7, 9]           — every odd-indexed element
a[::-1]     # [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]  — reversed
a[-3:]      # [7, 8, 9]                 — last 3 elements
a[:-2]      # [0, 1, 2, 3, 4, 5, 6, 7] — all but last 2
a[-5:-2]    # [5, 6, 7]                 — 5th-from-end up to 2nd-from-end
```

---

### The mental model

Think of it as a `while` loop:

```python
i = start
while (step > 0 and i < stop) or (step < 0 and i > stop):
    yield a[i]
    i += step
```

Two practical consequences:

1. **Never raises `IndexError`** — out-of-bounds slices simply clamp to the sequence length.
2. **`a[:]` is a shallow copy** — useful when you need an independent list with the same elements.