<!-- before / full-stack-developer / so-11227809-sorted-array-faster / run 1 -->

**Duration**: 151.1s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 151.06s > 90s

---
This is the classic **branch prediction** problem. Here's the full explanation:

---

## The Root Cause: Branch Misprediction

Modern CPUs achieve high throughput via deep instruction pipelines (14–20 stages on Intel Skylake). When a branch (`if`) is encountered, the CPU can't wait to evaluate it — it **speculatively executes** down a predicted path while the condition is still being resolved. If the prediction is wrong, the pipeline is **flushed** and the correct path is re-fetched.

### With Unsorted (Random) Data

```
data: 73 | 201 | 45 | 198 | 12 | 134 | ...
      NOT  TAKEN  NOT  TAKEN  NOT  TAKEN
```

Each value has a 50% chance of being ≥ 128, with no pattern. The predictor is guessing a coin flip — **~50% misprediction rate**.

Over the full run: `100,000 × 32,768 × 0.50 ≈ 1.6 billion mispredictions`.

Each misprediction costs ~15 pipeline cycles to flush and re-fetch: `1.6B × 15 / 3GHz ≈ 8+ seconds of wasted work`.

### With Sorted Data

```
data: 0, 0, 1, ..., 127 | [one transition] | 128, 129, ..., 255
      NOT NOT NOT ... NOT       ~2 misses        TAKEN TAKEN ... TAKEN
```

Only **1–2 mispredictions** per 32,768-element pass — essentially zero penalty.

---

## The Fix: Eliminate the Branch Entirely

You don't need to sort. Just write **branchless code** — sort-independent and just as fast:

**Option 1 — Ternary (compiler emits `cmov`, a branchless CPU instruction):**
```cpp
for (unsigned c = 0; c < arraySize; ++c) {
    sum += (data[c] >= 128) ? data[c] : 0;
}
```

**Option 2 — Arithmetic mask:**
```cpp
for (unsigned c = 0; c < arraySize; ++c) {
    int val = data[c];
    int mask = ~((val - 128) >> 31);  // all-ones if val >= 128, else 0
    sum += val & mask;
}
```

The x86 `cmov` instruction conditionally selects between two values **without branching**, making data order irrelevant to performance.

**Option 3 — SIMD (maximum throughput):**
With `-O3 -march=native`, the ternary form auto-vectorizes to AVX2, processing 8 integers per cycle — roughly 38× faster than the original unsorted version.

---

## Why Java Shows the Same Effect but Less Pronounced

The JVM runs on the **same CPU**, so the hardware effect is identical. The smaller ratio (~3× in Java vs ~6× in C++) is due to:

1. **JIT branch profiling** — HotSpot's C2 compiler detects the 50% branch probability and may emit `cmov` automatically, partially fixing unsorted data.
2. **JVM overhead dilution** — GC pauses, bounds checks, and safepoint polls add fixed costs to both runs, shrinking the relative difference.

---

## The Core Lesson

Big-O analysis is blind to this. Two identical O(n) loops can differ by 6× purely due to branch predictor behavior. The data layout and access patterns interact directly with CPU microarchitecture — and writing **branchless or SIMD code** is the proper solution, not relying on data being sorted.