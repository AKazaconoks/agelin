<!-- after / full-stack-developer / so-509211-python-slice-notation / run 1 -->

**Duration**: 43.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full explanation from the agent:

---

## Python Slice Notation: `a[start:stop:step]`

### 1. The Three Parts

**`start`** — index of the first element to include (inclusive).

**`stop`** — index at which to stop; this element is *not* included (exclusive). Python uses half-open intervals `[start, stop)`.

**`step`** — how many positions to advance after each element. Step of 2 = every other element.

---

### 2. Negative Values

**Negative indices** (for `start`/`stop`) count backward from the end:

```
effective_index = len(a) + negative_index
```

For a 10-element list: `-1` → 9, `-2` → 8, `-3` → 7, etc.

**Negative step** reverses the direction of traversal. With `step < 0`, Python walks backward from `start` down to (but not including) `stop`.

---

### 3. Omitted Parts and Their Defaults

| Part    | Omitted, step > 0 | Omitted, step < 0 |
|---------|-------------------|-------------------|
| `start` | `0` (beginning)   | `len(a)-1` (last element) |
| `stop`  | `len(a)` (past end) | before index 0 (includes first element) |
| `step`  | `1`               | — |

Out-of-range indices are silently clamped — `a[:9999]` never raises `IndexError`.

---

### 4. Worked Examples

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
#    0  1  2  3  4  5  6  7  8  9
```

| Expression   | Indices taken  | Result                     | Notes |
|--------------|---------------|----------------------------|-------|
| `a[2:7]`     | 2,3,4,5,6      | `[2,3,4,5,6]`              | Basic slice |
| `a[::2]`     | 0,2,4,6,8      | `[0,2,4,6,8]`              | Every other element |
| `a[1::2]`    | 1,3,5,7,9      | `[1,3,5,7,9]`              | Odd-indexed elements |
| `a[-3:]`     | 7,8,9          | `[7,8,9]`                  | `-3` → index 7 |
| `a[7:2:-1]`  | 7,6,5,4,3      | `[7,6,5,4,3]`              | Backward; index 2 excluded |
| `a[::-1]`    | 9,8,...,0      | `[9,8,7,6,5,4,3,2,1,0]`    | Full reversal |
| `a[2:7:3]`   | 2,5            | `[2,5]`                    | Every 3rd, within range |

---

### Mental Checklist for `a[x:y:z]`

1. **Sign of `z`** → determines direction of travel.
2. **Where does it start (`x`)?** → Convert negatives via `len(a) + x`.
3. **Where does it stop (`y`)?** → That index is always excluded; clamp out-of-range values.
4. **Walk the indices by step** → read off the elements.