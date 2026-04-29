<!-- after / full-stack-developer / so-509211-python-slice-notation / run 2 -->

**Duration**: 50.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a thorough explanation of Python slice notation, as produced by the agent:

---

## Python Slice Notation: `a[start:stop:step]`

Slice notation extracts a subsequence from any sequence (list, string, tuple, etc.). Each of the three parts is optional.

---

### 1. The Three Parts

**`start`** — the index of the **first element included** (inclusive).

**`stop`** — the index of the **first element excluded** (exclusive). This "exclusive stop" means `a[x:y]` contains exactly `y - x` elements (when positive and in bounds).

**`step`** — how many positions to advance after each element taken. Default is `1`.

---

### 2. Negative Values

**Negative `start` or `stop`** count from the end of the sequence:

```
effective_index = len(a) + negative_index
```

So for a 10-element list, `-1` → index `9`, `-3` → index `7`, etc.

**Negative `step`** traverses **backward**. The roles of start/stop reverse: start is the right boundary (inclusive), stop is the left boundary (exclusive). You need `start > stop` to get a non-empty result.

---

### 3. Defaults When Parts Are Omitted

The defaults for `start` and `stop` depend on the sign of `step`:

| Omitted | Positive step | Negative step |
|---|---|---|
| `start` | `0` (beginning) | `len(a)-1` (end) |
| `stop` | `len(a)` (past end) | Before index `0` |
| `step` | `1` | — |

Out-of-bounds values are silently clamped — no `IndexError` during slicing.

---

### 4. Worked Examples

```python
a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
#    0  1  2  3  4  5  6  7  8  9   <- positive indices
#  -10 -9 -8 -7 -6 -5 -4 -3 -2 -1  <- negative indices
```

**Basic start/stop:**
```python
a[2:6]    # [2, 3, 4, 5]      — index 2 up to (not including) 6
a[:4]     # [0, 1, 2, 3]      — from the beginning to index 4
a[6:]     # [6, 7, 8, 9]      — from index 6 to the end
a[:]      # [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]  — full shallow copy
```

**With step:**
```python
a[::2]    # [0, 2, 4, 6, 8]   — every other element
a[1::2]   # [1, 3, 5, 7, 9]   — every other, starting at index 1
a[::3]    # [0, 3, 6, 9]      — every third element
```

**Negative start/stop:**
```python
a[-4:]    # [6, 7, 8, 9]      — last four elements
a[:-4]    # [0, 1, 2, 3, 4, 5] — everything except the last four
a[-6:-2]  # [4, 5, 6, 7]      — -6→index 4, -2→index 8 (exclusive)
```

**Negative step (reverse traversal):**
```python
a[::-1]   # [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]  — full reversal
a[8:2:-1] # [8, 7, 6, 5, 4, 3]  — from 8 down to (not including) 2
a[::-2]   # [9, 7, 5, 3, 1]     — every other in reverse
```

**Edge cases:**
```python
a[5:2]    # []   — start > stop with positive step: nothing to collect
a[2:5:-1] # []   — start < stop with negative step: nothing to collect
a[100:]   # []   — out-of-bounds start, clamped silently
```

---

### The Mental Model

Think of slice indices as **cursor positions between elements**, not element labels. Position `0` is before the first element, position `n` is after the last. `a[x:y]` means "collect every element between cursor `x` and cursor `y`." This naturally makes `stop` exclusive, makes `a[i:i]` always empty, and explains why clamping and reversed defaults for negative steps all work the way they do.