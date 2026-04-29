<!-- after / electron-pro / so-11227809-sorted-array-faster / run 2 -->

**Duration**: 101.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 101.53s > 90s

---
## Why Sorting Makes the Loop ~6x Faster: Branch Prediction

The answer is **CPU branch prediction** — one of the most impactful microarchitectural features in modern hardware.

---

### 1. Pipelining and the Branch Problem

Modern CPUs use **pipelining**: multiple instructions are processed simultaneously across 10–20+ stages (fetch → decode → execute → write-back, etc.). This works great for sequential code, but branches (`if`) create a problem — the CPU doesn't know which path to take until several stages later, when the condition is actually evaluated.

Rather than **stall** the pipeline waiting for the result, the CPU **guesses** — this is the branch predictor.

---

### 2. How the Branch Predictor Works

The branch predictor uses history tables to track each branch's recent outcomes (taken/not-taken sequences) and predicts the next one. If the prediction is:

- **Correct**: Speculatively-executed instructions are committed. Zero penalty.
- **Wrong (misprediction)**: The entire pipeline is **flushed** — ~10–20 wasted cycles — and refilled from the correct path.

At 3 GHz, that's 3–7 nanoseconds per misprediction. Tiny individually, catastrophic at scale.

---

### 3. The Core Reason for the Speedup

**Unsorted data:** `rand() % 256` with threshold `>= 128` gives a ~50/50 true/false split distributed **randomly**:
```
T, F, T, T, F, F, T, F, T, F, ...  ← unpredictable coin flip
```
No predictor can do better than ~50% accuracy on a fair coin flip. With 32,768 branches per inner loop iteration, ~16,384 mispredictions per pass × 100,000 outer iterations × ~15 wasted cycles = **~2.46 trillion wasted cycles**.

**Sorted data:** The branch outcomes look like:
```
F, F, F, ...(16,384 times)..., T, T, T, ...(16,384 times)
```
The predictor locks in "predict Not Taken" immediately, is right 16,383 times in a row, mispredicts **once** at the transition ~16,384, then locks in "predict Taken" for the rest. Only **~2 mispredictions per outer iteration** instead of ~16,384.

The threshold `128` is not special — it's special because `rand() % 256` gives a **50/50 split**, which maximizes outcome entropy (and thus mispredictions). A threshold of `10` would be fast even unsorted, since the predictor would correctly guess "Not Taken" ~96% of the time.

---

### 4. Why Java Shows It Too, but Less

Java's JIT compiler (HotSpot) compiles hot loops to native machine code on the **same physical CPU** — the branch predictor hardware is identical. The effect is less pronounced because:

- HotSpot **profiles branches** during interpretation and can emit biased code or use `cmov`-style optimizations
- JVM overhead (GC, object allocation) adds baseline noise, making the branch-prediction delta a smaller fraction of total time
- HotSpot can sometimes **auto-vectorize** using SIMD instructions that process multiple elements simultaneously with no branch at all

---

### 5. Branchless Alternatives (No Sort Required)

**Ternary operator (compiler emits `cmov`):**
```cpp
sum += (data[c] >= 128) ? data[c] : 0;
```
With `-O2`, GCC/Clang compile this to a **conditional move** instruction — no branch, no misprediction penalty. The pipeline sees a *data* dependency instead of a *control* dependency, which it handles without flushing.

**Arithmetic bit-mask trick:**
```cpp
int t = (data[c] - 128) >> 31; // all 1s if < 128, all 0s if >= 128
sum += ~t & data[c];            // adds data[c] only when mask is all-0s
```

**SIMD / auto-vectorization (`-O3`):** Compilers can vectorize the loop to process 8–16 integers per clock cycle using SSE/AVX blend instructions — zero mispredictions and maximum throughput.

---

### Summary

| Factor | Unsorted | Sorted |
|---|---|---|
| Branch outcome pattern | Random (50/50) | Monotone (FFF…TTT) |
| Predictor accuracy | ~50% | ~99.99% |
| Mispredictions per outer iter | ~16,384 | ~2 |
| Dominant cost | Pipeline flushes | Useful arithmetic |

Both versions execute the **same number of instructions**. The 6x difference is entirely pipeline flushes vs. productive work. This benchmark is one of the most elegant demonstrations of what happens when branch prediction fails.