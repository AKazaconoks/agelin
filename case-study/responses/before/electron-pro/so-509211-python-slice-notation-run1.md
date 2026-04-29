<!-- before / electron-pro / so-509211-python-slice-notation / run 1 -->

**Duration**: 49.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown of Python slice notation:

---

## Python Slice Notation: `a[start:stop:step]`

Slicing works on any sequence (list, string, tuple, bytes). All three parts are optional.

---

### The Three Parts

- **`start`** — index of the first element to include (inclusive)
- **`stop`** — index where the slice stops (exclusive — this element is NOT included)
- **`step`** — how many positions to advance between picks (default 1)

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

a[2:7]    # [2, 3, 4, 5, 6]   indices 2..6, stop=7 excluded
a[2:7:2]  # [2, 4, 6]         every 2nd element between 2 and 7
```

---

### Negative Values

**Negative indices** count from the end: `-1` is the last element, `-2` is second-to-last, etc.

```python
a[-3:]    # [7, 8, 9]     last 3 elements
a[:-3]    # [0,1,2,3,4,5,6]  all but the last 3
a[-5:-2]  # [5, 6, 7]
```

**Negative step** reverses the direction of traversal:

```python
a[::-1]    # [9,8,7,6,5,4,3,2,1,0]  full reversal
a[7:2:-1]  # [7,6,5,4,3]            walk backward from 7 down to (not incl.) 2
a[::- 2]  # [9,7,5,3,1]            every other, reversed
```

With a negative step, `start` must be greater than `stop` or you get an empty result.

---

### Omitted Parts and Their Defaults

| Part | Default (step > 0) | Default (step < 0) |
|------|-------------------|-------------------|
| `start` | `0` (beginning) | `-1` (last element) |
| `stop` | `len(a)` (past end) | before index 0 (includes index 0) |
| `step` | `1` | — |

```python
a[:]    # entire sequence (also a shallow copy for lists)
a[2:]   # from index 2 to the end
a[:5]   # from start up to (not including) index 5
a[::2]  # every other element
a[::-1] # full reversal
```

---

### Worked Examples

```python
a = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
#     0    1    2    3    4    5    6    7
#    -8   -7   -6   -5   -4   -3   -2   -1
```

| Expression | Result | Why |
|------------|--------|-----|
| `a[:]` | `['a','b','c','d','e','f','g','h']` | Full copy, all defaults |
| `a[2:5]` | `['c','d','e']` | Indices 2, 3, 4 (5 excluded) |
| `a[:3]` | `['a','b','c']` | Start to index 3 |
| `a[5:]` | `['f','g','h']` | Index 5 to end |
| `a[::2]` | `['a','c','e','g']` | Every 2nd from start |
| `a[1::2]` | `['b','d','f','h']` | Every 2nd starting at 1 |
| `a[::-1]` | `['h','g','f','e','d','c','b','a']` | Full reversal |
| `a[-3:]` | `['f','g','h']` | Last 3 |
| `a[:-3]` | `['a','b','c','d','e']` | All but last 3 |
| `a[-1:-5:-1]` | `['h','g','f','e']` | Last 4, reversed |

---

### Key Rules

1. **`stop` is always exclusive** — the element at that index is never included.
2. **Out-of-range indices are safe** — Python clamps them silently; `a[0:9999]` on an 8-element list just returns the full list.
3. **Negative step reverses direction** — mentally swap your start and stop when using one.
4. **`a[:]` makes a shallow copy** — nested objects are not copied, just referenced.
5. **Empty slices never error** — if you can't advance from `start` toward `stop`, you just get `[]`.