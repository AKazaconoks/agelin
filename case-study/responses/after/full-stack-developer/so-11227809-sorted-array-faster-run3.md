<!-- after / full-stack-developer / so-11227809-sorted-array-faster / run 3 -->

**Duration**: 81.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Branch Prediction

The performance difference is caused entirely by **branch misprediction** in the CPU. The culprit is this single line executed 3.2 billion times:

```cpp
if (data[c] >= 128) sum += data[c];
```

---

### How the CPU Branch Predictor Works

Modern CPUs are deeply pipelined (15–20 stages). The CPU must *guess* the outcome of a branch and start fetching the next instructions before it has finished evaluating the condition — like a railroad switchman throwing a lever before the train arrives.

- **Correct prediction** → zero extra cycles, the pipeline flows uninterrupted.
- **Wrong prediction** → pipeline flush: discard all speculatively fetched instructions, re-fetch from the correct path. This costs **10–20 clock cycles** on modern x86.

---

### Why Sorted Data Wins

With sorted data the array is `[0, 0, ..., 127, 128, ..., 255]`. The branch sequence is:

```
NOT TAKEN × 16384, then TAKEN × 16384
```

The predictor sees a long run of NOT TAKEN, locks in that prediction, then sees a long run of TAKEN and locks in the opposite. There is **exactly one misprediction** at the transition. Out of 3.2 billion evaluations, virtually all are correctly predicted.

With **random** data the sequence is an unpredictable coin flip. The predictor is wrong ~50% of the time — roughly **1.6 billion pipeline flushes**.

| Scenario | Mispredictions | Wasted cycles (×15) | Cost at 3 GHz |
|---|---|---|---|
| Sorted | ~100,000 | ~1.5M | ~0.5 ms |
| Unsorted | ~1.6 billion | ~24 billion | ~8,000 ms |

That arithmetic maps directly to the observed ~6x difference.

---

### The Fix: Eliminate the Branch Entirely

Replace the conditional with arithmetic that computes the same result without a jump:

```cpp
// Original — branch-dependent
if (data[c] >= 128) sum += data[c];

// Branchless — same result, no misprediction possible
int t = (data[c] - 128) >> 31;  // 0x00000000 if >= 128, 0xFFFFFFFF if < 128
sum += ~t & data[c];             // passes value through or zeroes it
```

How it works:
- `data[c] - 128` is negative when `data[c] < 128`, non-negative otherwise.
- Arithmetic right-shift by 31 fills all bits with the sign bit: `-1` (all 1s) if negative, `0` if not.
- `~t` becomes all-1s when the value should be included, all-0s otherwise.
- ANDing with `data[c]` either passes the value or zeroes it — no jump instruction needed.

Alternatively, a good compiler with `-O2` will often emit a `CMOV` (conditional move) instruction for:

```cpp
sum += (data[c] >= 128) ? data[c] : 0;
```

The branchless version runs at the same speed on **both** sorted and unsorted data.

---

### Why Java Shows the Same Effect but Less Pronounced

Java's JIT compiler (HotSpot C2) compiles hot bytecode to native machine instructions including the same conditional jumps — the CPU's branch predictor doesn't know or care whether the code came from C++ or Java. The effect is **less pronounced** because:

1. JVM interpretation overhead during warm-up inflates both runtimes, compressing the ratio.
2. HotSpot observes branch behavior during the interpreted phase and may generate smarter native code.
3. Other JVM overhead (GC, safepoint polls) sets a performance floor that compresses the ratio.

The underlying hardware effect is identical — Java is not immune.