<!-- before / full-stack-developer / so-11227809-sorted-array-faster / run 3 -->

**Duration**: 97.7s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 97.68s > 90s

---
## CPU Branch Prediction: Why Sorting Makes the Loop ~6x Faster

The performance difference has **nothing to do with sorting itself** — it's entirely caused by **CPU branch misprediction** on this line:

```cpp
if (data[c] >= 128) sum += data[c];
```

---

### How the CPU Pipeline Works

Modern CPUs are deeply pipelined (~14–19 stages on Intel Skylake). At the **Fetch** stage, the CPU doesn't yet know the outcome of a branch (that's computed at **Execute**, ~15 stages later). Rather than stall, the CPU **speculatively guesses** the branch outcome and keeps executing ahead.

- **Correct guess** → speculative work is committed, no time lost
- **Wrong guess** → pipeline is flushed, ~15–20 cycles are wasted, execution restarts

---

### Random Data: ~50% Misprediction Rate

With `rand() % 256` and threshold `>= 128`, each element is independently above/below the threshold with 50% probability:

```
data[]:  43  197  12  230  88  155  3  201  ...
branch:  N   T    N   T    N   T    N  T    ...  ← purely random
```

A 50/50 random sequence is **maximally unpredictable** — no hardware predictor can beat ~50% accuracy. Every other prediction is wrong, every misprediction flushes the pipeline.

**Rough math:**
```
3,276,800,000 branch iterations × 50% miss rate × 15 cycle penalty / 3GHz ≈ 8–10 seconds wasted
```

That matches the ~9.6 second delta almost exactly.

---

### Sorted Data: ~1 Misprediction Per Outer Loop

After sorting, the array looks like:

```
data[]:  0  0  1  ...  127  | 128  128  ...  255
branch:  N  N  N  ...  N    | T    T    ...  T
```

There is **one transition point**. The predictor sees 16,384 consecutive "not taken" → locks in. Then sees 16,384 consecutive "taken" → locks in again. Total mispredictions over all 100,000 outer iterations: ~100,000 vs ~1.6 billion. Essentially zero.

---

### The Fix: Branchless Code

Replace the conditional with pure arithmetic — no branch means no prediction needed:

```cpp
// Instead of: if (data[c] >= 128) sum += data[c];

// Bitwise mask approach:
int t    = data[c] - 128;
int mask = ~(t >> 31);      // 0xFFFFFFFF if data[c]>=128, else 0x00000000
sum     += data[c] & mask;

// Or, let the compiler emit a CMOVcc instruction at -O2:
sum += (data[c] >= 128) ? data[c] : 0;
```

Verify the compiler emitted `cmov` (not a conditional jump) by checking the assembly:

```bash
g++ -O2 -S -o output.asm main.cpp
grep -E "cmov|jg|jl" output.asm
```

---

### Performance Summary

| Approach | Sorted | Random | Notes |
|---|---|---|---|
| Original `if` | ~1.9s | ~11.5s | Data-dependent |
| Branchless (bitwise/cmov) | ~1.5s | ~1.5s | Consistent |
| SIMD auto-vectorized (`-O2 -march=native`) | ~0.3s | ~0.3s | 8–16x further gain |

---

### Why Java Shows the Same Effect (But Weaker)

Java's JIT compiler applies similar speculation and branch prediction at the hardware level, but the JVM's JIT also performs its own branch frequency profiling and may rewrite hot branches into branchless bytecode after enough iterations — reducing but not eliminating the effect.

**The takeaway:** this is a hardware architecture concern, not a software bug. Data patterns directly affect execution time when branches are involved. Branchless, data-independent code is both faster and more predictable.