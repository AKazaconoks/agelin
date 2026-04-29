<!-- before / full-stack-developer / so-509211-python-slice-notation / run 1 -->

**Duration**: 59.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full explanation from the agent:

---

## Python Slice Notation: `a[start:stop:step]`

Python's slice notation selects a subsequence from any sequence type (lists, strings, tuples, etc.). The result is always a new object of the same type.

---

### 1. The Three Parts

- **start** — index of the first element to *include*
- **stop** — index of the first element to *exclude* (the slice stops just before this position)
- **step** — stride between selected elements

The stop-is-exclusive rule mirrors `range(start, stop)` and means `len(a[x:y]) == y - x` when in bounds.

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

a[2:7:2]   # start=2, stop=7, step=2
# indices visited: 2, 4, 6  (stopped before 7)
# result: [2, 4, 6]
```

---

### 2. Negative Values

**Negative indices** count from the end: `-1` is the last element, `-2` second-to-last, etc. Python converts them as `len(a) + negative_index`.

```python
a[-3:]    # last 3 elements      → [7, 8, 9]
a[:-2]    # all but last 2       → [0, 1, 2, 3, 4, 5, 6, 7]
a[-5:-2]  # middle slice         → [5, 6, 7]
```

**Negative step** reverses traversal direction. Now `start` should be greater than `stop`:

```python
a[7:2:-1]  # → [7, 6, 5, 4, 3]
a[::-1]    # reverse the entire sequence → [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
```

If start < stop with a negative step, the result is an empty list (no error).

---

### 3. Omitted Parts and Their Defaults

| Part omitted | step > 0 (forward)  | step < 0 (backward)         |
|--------------|---------------------|-----------------------------|
| **start**    | `0` (beginning)     | `len(a) - 1` (last element) |
| **stop**     | `len(a)` (past end) | before index `0` (includes index 0) |
| **step**     | `1`                 | must be given explicitly     |

```python
a[:]     # shallow copy of entire list
a[3:]    # from index 3 to end  → [3, 4, 5, 6, 7, 8, 9]
a[:5]    # from start to index 4 → [0, 1, 2, 3, 4]
a[::2]   # every second element → [0, 2, 4, 6, 8]
a[::-1]  # reversed            → [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
```

Out-of-bounds indices are silently clamped — `a[0:1000]` on a 10-element list just returns the whole list.

---

### 4. Worked Examples

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

**`a[1:8:3]`** — from index 1, step 3, stop before 8:
```
indices: 1 → 4 → 7 → (next would be 10, ≥ 8, halt)
result:  [1, 4, 7]
```

**`a[-1:-6:-1]`** — from index 9 (= -1), backward, stop before index 4 (= -6):
```
indices: 9 → 8 → 7 → 6 → 5 → (4, ≤ 4, halt)
result:  [9, 8, 7, 6, 5]
```

**`a[5:1:-2]`** — from index 5, backward by 2, stop before 1:
```
indices: 5 → 3 → (1, ≤ 1, halt)
result:  [5, 3]
```

**`a[3:3]`** — start equals stop:
```
result:  []
```

---

### Mental Checklist

1. **Direction?** Positive step = left to right; negative step = right to left.
2. **Where to start?** Fill in the default based on direction if omitted.
3. **Where to stop?** Stop index is never included; fill in default if omitted.
4. **Stride size?** Every `abs(step)` positions between selections.
5. **Negative indices?** Add `len(a)` to convert to a positive position first.