<!-- after / full-stack-developer / so-11227809-sorted-array-faster / run 1 -->

**Duration**: 82.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Branch Prediction: Why Sorting Makes the Loop ~6x Faster

### 1. What Is Branch Prediction?

Modern CPUs use **pipelining** — they break instructions into stages (fetch, decode, execute, write-back) and work on multiple instructions simultaneously. A typical pipeline is 15–20 stages deep.

The problem: at a conditional branch (`if`), the CPU doesn't know which instruction to fetch next until the condition is *evaluated* — but that happens several stages into the pipeline. Rather than stall, the CPU **guesses** which way the branch will go via a dedicated hardware unit called the **branch predictor**. It speculatively fetches and executes instructions along the predicted path.

- **Correct guess**: execution continues with no penalty.
- **Wrong guess** (misprediction): the CPU must flush the pipeline, roll back speculative state, and restart — costing roughly **10–20 clock cycles** per misprediction.

At 3 GHz, that's ~5 ns per miss. Insignificant once; catastrophic across 3.2 billion iterations.

---

### 2. Why Sorted Data Helps

The critical branch is:

```cpp
if (data[c] >= 128) sum += data[c];
```

With sorted data, the outcome sequence looks like:

```
NOT TAKEN, NOT TAKEN, ..., NOT TAKEN,  ← values 0–127
TAKEN, TAKEN, ..., TAKEN               ← values 128–255
```

Even the simplest predictor learns this immediately. There is exactly **one** misprediction (at the ~16384 transition point), then perfect prediction for the rest. Accuracy approaches **99.997%** — the pipeline stays full.

---

### 3. Why Unsorted Data Hurts

With `rand() % 256`, whether any given element is ≥ 128 is essentially a coin flip. No history-based predictor can beat ~50% accuracy on truly random data.

At 50% misprediction across 3.2 billion branch executions:

```
1.6e9 mispredictions × 15 cycles / 3e9 Hz ≈ 8 seconds wasted
```

Observed difference: 11.54s − 1.93s = **9.61s**. The math matches. The CPU is spending most of its time recovering from bad guesses. Java shows the same effect because the JVM's JIT emits native machine code using the same physical branch predictor hardware — the language is irrelevant.

---

### 4. How to Fix It: Go Branchless

Sorting is a workaround. The real fix is to **eliminate the branch structurally**.

**Option A — Ternary (compilers emit `cmov`, no pipeline flush):**

```cpp
for (unsigned c = 0; c < arraySize; ++c) {
    sum += (data[c] >= 128) ? data[c] : 0;
}
```

GCC/Clang at `-O2` reliably emit a `cmov` (conditional move) instruction — a hardware data-select with no branch, no flush.

**Option B — Bitwise mask trick (fully portable):**

```cpp
for (unsigned c = 0; c < arraySize; ++c) {
    // Arithmetic right shift fills all 32 bits with the sign bit.
    // ~0x00000000 = 0xFFFFFFFF when data[c] >= 128; 0 otherwise.
    int mask = ~((data[c] - 128) >> 31);
    sum += data[c] & mask;
}
```

**Option C — SIMD auto-vectorization** (compile with `-O2 -march=native`): the ternary form above auto-vectorizes to AVX2, processing 8 integers per cycle with `vpcmpgtd` + `vpand`.

---

### 5. Performance Summary

| Variant | Sorted required? | Approx. time |
|---|---|---|
| Original, unsorted | No | ~11.5s |
| Original, sorted | Yes | ~1.9s |
| Branchless `cmov` / bitwise | No | ~1–2s |
| Branchless + SIMD (`-march=native`) | No | < 0.5s |

---

**Key takeaway**: The sort is just a trick that makes the branch trivially predictable. The real fix is to remove the branch entirely. The ternary/`cmov` form is the idiomatic solution — it's clear, compiles to branchless code under standard optimization flags, and requires no data preprocessing.