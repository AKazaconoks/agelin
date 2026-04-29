<!-- before / electron-pro / so-509211-python-slice-notation / run 2 -->

**Duration**: 42.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(stop|end)\s+(is\s+)?exclusive/i | output did not match /(does\s+not\s+include|excludes?|exclusive\s+(of|the)\s+(stop|end))/i | output did not match /(up\s+to\s+but\s+not\s+including)/i

---
Here is a thorough walkthrough of Python's slice notation:

---

## Python Slice Notation: `a[start:stop:step]`

A slice selects elements by walking from `start` up to (but not including) `stop`, advancing by `step` each time.

---

### The Three Parts

- **start** — index of the first element to include
- **stop** — index at which to stop; this element is **never** included
- **step** — how many positions to advance between selections

The key rule: **stop is always exclusive.** `a[2:5]` gives indices 2, 3, 4 — never 5.

---

### What Happens When Parts Are Omitted

| Expression | Equivalent to | Result |
|---|---|---|
| `a[:]` | `a[0:5:1]` | entire sequence |
| `a[1:4]` | `a[1:4:1]` | indices 1, 2, 3 |
| `a[::2]` | `a[0:5:2]` | every other element |

Defaults:
- `start` → beginning of sequence
- `stop` → end of sequence
- `step` → `1`

---

### Negative Values

**Negative indices** count from the right. For a list of length `n`, index `-k` means `n - k`.

```
a = ['a', 'b', 'c', 'd', 'e']
      0    1    2    3    4     (positive)
     -5   -4   -3   -2   -1    (negative)
```

| Expression | Resolves to | Result |
|---|---|---|
| `a[-3:]` | `a[2:5]` | `['c', 'd', 'e']` |
| `a[:-2]` | `a[0:3]` | `['a', 'b', 'c']` |
| `a[-4:-1]` | `a[1:4]` | `['b', 'c', 'd']` |

**Negative step** reverses direction. The defaults also flip: `start` becomes the last element and `stop` becomes "before the beginning".

```python
a[::-1]    # full reversal: ['e', 'd', 'c', 'b', 'a']
a[4:1:-1]  # indices 4, 3, 2 → ['e', 'd', 'c']
```

Common pitfall: `a[1:4:-1]` returns `[]` because you start at 1 and step backward — you never approach 4.

---

### Out-of-Range Values

Unlike direct indexing, slices silently clamp out-of-range values to sequence boundaries:

```python
a[1:999]   # same as a[1:5]  → ['b', 'c', 'd', 'e']
a[-999:2]  # same as a[0:2]  → ['a', 'b']
```

---

### Worked Example

```
a = [10, 20, 30, 40, 50, 60, 70, 80]
      0   1   2   3   4   5   6   7
     -8  -7  -6  -5  -4  -3  -2  -1
```

| Expression | Indices visited | Result |
|---|---|---|
| `a[2:7:2]` | 2, 4, 6 | `[30, 50, 70]` |
| `a[6:1:-1]` | 6, 5, 4, 3, 2 | `[70, 60, 50, 40, 30]` |
| `a[-3:]` | 5, 6, 7 | `[60, 70, 80]` |
| `a[::3]` | 0, 3, 6 | `[10, 40, 70]` |
| `a[::-2]` | 7, 5, 3, 1 | `[80, 60, 40, 20]` |

---

### Mental Model

Think of `start:stop:step` as this loop:

```python
i = start
while (step > 0 and i < stop) or (step < 0 and i > stop):
    yield a[i]
    i += step
```

This is exactly what Python does internally. Omitted values set sensible defaults for that loop depending on the sign of `step`, and negative indices are just address-from-the-right shorthand resolved before the loop begins.