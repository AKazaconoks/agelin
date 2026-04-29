<!-- before / bash-expert / so-11227809-sorted-array-faster / run 1 -->

**Duration**: 66.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## The Mystery of the 6x Speedup: Branch Prediction

This is one of the most famous demonstrations of **CPU branch prediction** in action.

---

### What's Happening

The inner loop has a conditional:

```cpp
if (data[c] >= 128) sum += data[c];
```

Modern CPUs don't wait to evaluate a branch before fetching the next instructions — they *predict* which path will be taken and speculatively execute ahead. If the prediction is wrong, they must flush the pipeline and restart — a costly **branch misprediction penalty** (~10–20 cycles wasted per mispredict).

---

### Unsorted Data: ~50% Misprediction Rate

With random values in `[0, 255]`, the condition is true roughly half the time with **no discernible pattern**:

```
values:    84,  203,  45,  167,  12,  234 ...
condition:  F    T     F    T     F    T  ...  ← unpredictable
```

The predictor guesses wrong ~50% of the time. Over `100,000 × 32,768 = 3.2 billion` iterations, those pipeline flushes add up catastrophically.

---

### Sorted Data: Near-Zero Mispredictions

After sorting, all values `< 128` come first, then all values `≥ 128`:

```
values:    12,  45,  78 ... 128, 167, 203 ...
condition:  F    F    F  ...  T    T    T  ...  ← two long runs
```

The predictor quickly learns "always not-taken," cruises through thousands of iterations, hits the transition once, adapts to "always taken," and cruises again. Almost zero wasted cycles.

---

### The Railroad Analogy

Think of a train junction operator who must set the switch *before* the train arrives:

- **Unsorted (random):** The train goes left or right randomly — the operator is wrong half the time, causing trains to brake, back up, and reroute. Chaos.
- **Sorted:** All trains go left for the first half, then right for the second half. The operator is almost never wrong.

---

### The Fix: Go Branchless

Eliminate the unpredictable branch entirely:

```cpp
// Original — has an unpredictable branch
if (data[c] >= 128) sum += data[c];

// Branchless — no branch at all
sum += data[c] * (data[c] >= 128);
```

`(data[c] >= 128)` evaluates to `0` or `1`, so the multiplication acts as a conditional with no branch instruction. Performance becomes fast and **order-independent**.

---

### Why Java Is Less Pronounced

Java's HotSpot JIT compiler performs profile-guided optimization at runtime — it detects branch patterns after warming up and can partially compensate. The effect is still real (~4x in Java vs ~6x in C++), but the JIT softens the gap.

---

### Summary

| | Unsorted | Sorted | Branchless |
|---|---|---|---|
| Misprediction rate | ~50% | ~0% | N/A (no branch) |
| Time | 11.54s | 1.93s | ~1.93s regardless of order |

The root cause is that the CPU's branch predictor — an optimization designed to keep the instruction pipeline full — backfires catastrophically on random data. Sorting happens to make the branch perfectly predictable, and branchless arithmetic sidesteps the problem entirely.