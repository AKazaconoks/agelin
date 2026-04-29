<!-- after / electron-pro / so-11227809-sorted-array-faster / run 3 -->

**Duration**: 288.6s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 288.60s > 90s

---
## Branch Prediction — Why Sorted Data is ~6x Faster

The `if (data[c] >= 128)` inside the inner loop is the culprit. Here is what is happening at the hardware level and how to fix it.

---

### Root Cause: Branch Misprediction

Modern CPUs do not wait to evaluate a conditional branch before proceeding — they **speculatively guess** which path to take and execute instructions ahead of time. When the guess is wrong (a **misprediction**), the CPU must:

1. Flush all speculative work from the pipeline (dozens of in-flight instructions).
2. Restore register state to the branch point.
3. Re-fetch instructions from the correct path.

This costs roughly **15–20 pipeline cycles** per misprediction on modern Intel/AMD hardware (e.g., ~15 cycles on Skylake).

---

### Why Random vs Sorted Matters

| Data Pattern | Mispredictions per inner pass | Observed time |
|---|---|---|
| Unsorted (random) | ~16,384 — the condition is true/false randomly, ~50% wrong | 11.54s |
| Sorted | ~1 — one transition from "false" to "true" midway through | 1.93s |

With **random data**, the values `0–255` are shuffled, so `>= 128` is true or false unpredictably — the worst possible case for any predictor.

With **sorted data**, the branch is `false` for the first ~16,384 elements (values 0–127) and `true` for the second ~16,384 (values 128–255). The predictor sees a long streak of identical outcomes and nails every guess except the one transition point.

---

### The Fix: Eliminate the Branch Entirely

Replace the conditional with **branchless arithmetic** so the CPU never has to predict anything:

```cpp
// Original — has a branch
if (data[c] >= 128) sum += data[c];

// Branchless — no jump instruction
sum += data[c] & -(data[c] >= 128);
```

How it works: `(data[c] >= 128)` evaluates to `1` or `0`. Negating with two's complement: `-1 = 0xFFFFFFFF` (all ones), `-0 = 0`. ANDing `data[c]` with this mask either passes the value through or zeroes it — no branch, no misprediction.

A ternary also works and compilers typically emit a `cmov` (conditional move) instruction for it — no jump at all:

```cpp
sum += (data[c] >= 128) ? data[c] : 0;
```

The resulting assembly with `-O2`:

```asm
; Branchless cmov version
    xor    eax, eax
    mov    ebx, [rsi + rcx*4]
    cmp    ebx, 128
    cmovge eax, ebx       ; select data[c] or 0 — no jump
    add    rdx, rax
```

With this change, the timing becomes identical whether the data is sorted or not.

---

### Why Java Shows the Same Effect

The JVM's JIT compiler (HotSpot C2) emits native x86 conditional jumps for the same construct, backed by the same CPU branch prediction hardware. Same predictor, same penalty on random data — just slightly less pronounced because the JVM JIT can also hoist or reorder some work.

---

**TL;DR:** The CPU speculatively executes past branches. Sorted data has a predictable pattern (all-false then all-true), so the predictor is almost never wrong. Random data is ~50% wrong, each mistake flushing ~15 cycles of pipeline work. Removing the branch with `cmov` or bitmasking eliminates the problem entirely.