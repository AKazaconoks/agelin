<!-- after / full-stack-developer / so-509211-python-slice-notation / run 3 -->

**Duration**: 52.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(stop|end)\s+(is\s+)?exclusive/i | output did not match /(does\s+not\s+include|excludes?|exclusive\s+(of|the)\s+(stop|end))/i | output did not match /(up\s+to\s+but\s+not\s+including)/i

---
Here's a thorough breakdown of Python slice notation:

---

## Python Slice Notation: `a[start:stop:step]`

### 1. The Three Parts

**`start`** — inclusive. The index of the first element included in the result.

**`stop`** — exclusive. The slice goes up to *but not including* this index. Reading `a[x:y]` as the half-open interval **[x, y)** — the same convention as `range(x, y)` — makes this intuitive. A benefit: adjacent slices like `a[:n]` and `a[n:]` partition the sequence without overlap.

**`step`** — the stride. `1` means every element, `2` means every other, `-1` means walk backwards, etc.

---

### 2. Negative Values

**Negative `start` or `stop`** count from the right: the effective index is `len(a) + index`.

| Written | Effective (len=6) |
|---------|-------------------|
| `-1`    | `5` (last)        |
| `-3`    | `3`               |

So `a[-3:]` = last 3 elements, `a[:-1]` = everything except the last.

**Negative `step`** reverses direction. The slice walks right-to-left, so `start` must be to the *right* of `stop` to get any elements. `a[::-1]` reverses the whole sequence.

---

### 3. Omitted Parts (Defaults)

| Part    | Default when `step > 0`   | Default when `step < 0` |
|---------|--------------------------|------------------------|
| `start` | `0` (first element)      | last element           |
| `stop`  | `len(a)` (past the end)  | past the beginning     |
| `step`  | `1`                      | —                      |

Highlights:
- `a[:]` — full copy
- `a[::2]` — every other element
- `a[::-1]` — reversed
- Out-of-range values are **silently clamped** (no `IndexError`)

---

### 4. Worked Example

```
a = [10, 20, 30, 40, 50, 60]
#     0    1    2    3    4    5   (positive)
#    -6   -5   -4   -3   -2   -1  (negative)
```

| Expression   | Selected indices | Result                       |
|--------------|-----------------|------------------------------|
| `a[1:4]`     | 1, 2, 3         | `[20, 30, 40]`               |
| `a[:3]`      | 0, 1, 2         | `[10, 20, 30]`               |
| `a[3:]`      | 3, 4, 5         | `[40, 50, 60]`               |
| `a[:]`       | all             | `[10, 20, 30, 40, 50, 60]`   |
| `a[::2]`     | 0, 2, 4         | `[10, 30, 50]`               |
| `a[1::2]`    | 1, 3, 5         | `[20, 40, 60]`               |
| `a[-3:]`     | 3, 4, 5         | `[40, 50, 60]`               |
| `a[:-2]`     | 0, 1, 2, 3      | `[10, 20, 30, 40]`           |
| `a[-4:-1]`   | 2, 3, 4         | `[30, 40, 50]`               |
| `a[::-1]`    | 5→0 (all, rev.) | `[60, 50, 40, 30, 20, 10]`   |
| `a[4:1:-1]`  | 4, 3, 2         | `[50, 40, 30]`               |

---

### Quick Mental Model

1. Resolve negatives: `neg_index → len(a) + neg_index`
2. Positive step → walk forward from `start`, stop before `stop`
3. Negative step → walk backward from `start`, stop before `stop`
4. Omitted parts default to "the natural end for the direction you're travelling"
5. Out-of-range is always clamped — slices never raise `IndexError`