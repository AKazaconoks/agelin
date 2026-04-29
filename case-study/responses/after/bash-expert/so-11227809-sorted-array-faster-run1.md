<!-- after / bash-expert / so-11227809-sorted-array-faster / run 1 -->

**Duration**: 73.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Branch Prediction

This is a classic demonstration of **branch prediction** — one of the most dramatic examples of how CPU microarchitecture can make seemingly identical code perform vastly differently.

---

### 1. CPU Pipelines and Branch Prediction

Modern CPUs use **instruction pipelining** to overlap execution of many instructions at once (fetch → decode → execute → writeback, etc. — often 15–20 stages deep). When the pipeline hits a conditional branch (`if (data[c] >= 128)`), it doesn't know which path to take until the condition is actually evaluated.

Rather than stall, the CPU **guesses** using a **branch predictor** — hardware that records historical branch outcomes and predicts future ones. It speculatively executes down the predicted path. If right: great. If wrong: the pipeline is **flushed** and restarted from the correct path.

---

### 2. Why Sorted Data Helps

With **random data**, the branch outcome is chaotic:
```
T N T T N N T N N T T N N T N N T T N T ...
```
The predictor can't learn a pattern — it's effectively flipping a coin, getting ~50% accuracy.

With **sorted data**, the pattern is trivially learnable:
```
N N N N N N ... N N T T T T T T ... T T T
```
The predictor quickly enters a "always not-taken" mode, then near the threshold switches to "always taken." Accuracy approaches 99%+.

---

### 3. Cost of a Misprediction

Each misprediction triggers a **pipeline flush**:
1. CPU speculated down the wrong path and executed ~15–20 instructions
2. All that work is discarded
3. Pipeline restarts from the correct target
4. ~15–20 cycles are wasted before useful work resumes

On random data with ~50% misprediction rate, you pay this penalty on roughly half of the 32,768 × 100,000 iterations. That's billions of wasted cycles — hence 11.54s vs. 1.93s.

---

### 4. Eliminate the Branch Entirely (Branchless Rewrite)

The best fix is to remove the conditional branch so data order is irrelevant:

```cpp
for (unsigned i = 0; i < 100000; ++i) {
    for (unsigned c = 0; c < arraySize; ++c) {
        // Arithmetic right-shift propagates sign bit:
        // data[c]-128 < 0  → 0xFFFFFFFF → ~0xFFFFFFFF = 0x00000000
        // data[c]-128 >= 0 → 0x00000000 → ~0x00000000 = 0xFFFFFFFF
        int mask = ~((data[c] - 128) >> 31);
        sum += data[c] & mask;
    }
}
```

**How the mask works:**
- `data[c] - 128` is negative when `data[c] < 128`, non-negative otherwise
- `>> 31` (arithmetic shift) propagates the sign bit: negative → `0xFFFFFFFF`, non-negative → `0x00000000`
- `~` flips it: `0xFFFFFFFF` when we want to include `data[c]`, `0x00000000` when we don't
- `& mask` either passes through `data[c]` or produces `0` — no branch ever taken

Alternatively, many compilers will emit a `CMOV` (conditional move) instruction — a branchless CPU primitive — if you write:

```cpp
sum += (data[c] >= 128) ? data[c] : 0;
```

Both branchless forms run at ~1.9–2.5s **regardless of sort order**.

---

### 5. Why Java Shows the Same (But Lesser) Effect

Java is JIT-compiled to the same native machine instructions, which run on the same hardware branch predictor — so the fundamental effect is identical. It's less pronounced because:

- **JIT warmup time** blurs the measurement boundary
- The **HotSpot JVM** may apply loop unrolling or auto-vectorization that partially masks branch misprediction costs
- **JVM overhead** amortizes the relative difference in microbenchmarks

---

### Summary

| Condition | Prediction Accuracy | Performance |
|---|---|---|
| Unsorted data | ~50% (random noise) | 11.54s |
| Sorted data | ~99% (learned pattern) | 1.93s |
| Branchless (either) | N/A — no branch | ~2.0s |

The takeaway: the same O(n) loop can vary by 6× purely due to branch predictor behavior. When a branch has a data-dependent, hard-to-predict outcome in a hot loop, go branchless.