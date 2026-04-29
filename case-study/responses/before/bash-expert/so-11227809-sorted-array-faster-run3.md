<!-- before / bash-expert / so-11227809-sorted-array-faster / run 3 -->

**Duration**: 59.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Branch Prediction — The Root Cause

This is a classic **CPU branch prediction** problem. The `if (data[c] >= 128)` creates a conditional branch the CPU must predict before it knows the result.

---

### How Branch Prediction Works

Modern CPUs don't wait for a condition to resolve — they *speculatively execute* the predicted path ahead of time using a **branch predictor** (Pattern History Tables, 2-bit saturating counters, etc.). If the prediction is wrong:

1. All speculatively executed instructions are **flushed** from the pipeline
2. The pipeline restarts from the correct path
3. **Penalty: ~10–20 wasted cycles** per misprediction

With a 14–20 stage pipeline, that's a significant stall.

---

### Why Sorted Data is ~6x Faster

**Unsorted data** — branch pattern is essentially random:
```
data: [45, 201, 67, 189, 23, 156, ...]
branch: N  Y   N   Y   N   Y  ...   ← ~50% prediction accuracy
```
~16,384 mispredictions × 15 cycles = ~246,000 wasted cycles *per outer iteration*.

**Sorted data** — branch pattern becomes perfectly predictable:
```
data: [0, 1, ..., 127, 128, ..., 255]
branch: NNNNN...NNNNYYYY...YYYY     ← ~99.9% prediction accuracy
```
Only **one misprediction** occurs at the 127→128 transition. The predictor quickly learns "always not-taken" then "always taken."

---

### Why Java Shows the Same Effect

Java's **HotSpot JIT** compiles hot loops to native machine code with identical branching instructions. Branch prediction happens at the **hardware level** — the CPU has no idea it came from Java. Same silicon, same problem.

---

### Fix: Branchless Code

Eliminate the branch entirely using bit manipulation:

```cpp
for (unsigned c = 0; c < arraySize; ++c) {
    int mask = (data[c] - 128) >> 31;  // 0 if >= 128, -1 (all 1s) if < 128
    sum += data[c] & ~mask;            // adds data[c] or 0, no branch
}
```

How it works:
- `data[c] >= 128` → `(data[c] - 128)` is non-negative → arithmetic right shift gives `0` → `~mask = 0xFFFFFFFF` → adds `data[c]`
- `data[c] < 128`  → `(data[c] - 128)` is negative → arithmetic right shift gives `-1` (all 1s) → `~mask = 0` → adds `0`

Modern compilers will also often convert `sum += (data[c] >= 128) ? data[c] : 0;` into a `CMOV` (conditional move) instruction — also branchless. This version performs consistently regardless of data order, without needing to sort first.