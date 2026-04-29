<!-- before / electron-pro / so-11227809-sorted-array-faster / run 3 -->

**Duration**: 126.2s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 126.22s > 90s

---
## Branch Prediction — Why Sorting Makes Your Loop ~6x Faster

This is one of the most instructive performance puzzles in systems programming. The answer is **CPU branch prediction and pipeline stalling**.

---

### 1. The CPU Pipeline

Modern CPUs execute instructions using a deep **pipeline** (14–24 stages on modern Intel/AMD), where many instructions are in-flight simultaneously. When the CPU hits a conditional branch (`if (data[c] >= 128)`), it doesn't know which way to go yet — the condition resolves several stages later.

Rather than stall, the CPU **guesses** (speculates) which path to take and continues filling the pipeline. This guess is managed by the **Branch Prediction Unit (BPU)**.

```
Fetch → Decode → Dispatch → Execute → Write-back
                              ↑
                    Branch resolves here (~15-20 cycles later)
```

---

### 2. Random Data → ~50% Misprediction Rate

With `rand() % 256`, values are uniformly distributed. Half are `>= 128`, half aren't — in **random order**. The BPU cannot predict a fair coin flip.

**On every misprediction:**
1. The CPU has been speculatively executing the wrong path for ~15–20 cycles.
2. It detects the mistake when the branch finally resolves.
3. It **flushes the entire pipeline** and refetches from the correct path.

The math is brutal:

```
32,768 elements × 100,000 iterations = ~3.28 billion branch evaluations
~50% misprediction rate             = ~1.64 billion mispredictions
~15 cycle penalty each @ 3GHz       = ~8.2 seconds wasted
```

This closely matches the observed 9.6-second difference (11.54s − 1.93s).

---

### 3. Sorted Data → ~2 Mispredictions Per Iteration

After `std::sort`, the array is:

```
[0, 0, ..., 127, 127, | 128, 128, ..., 255, 255]
 ←  branch never taken →  ← branch always taken →
```

The BPU quickly learns "always not taken," then mispredicts exactly **once** at the transition to "always taken." That's ~2 mispredictions per iteration vs. ~16,384. The pipeline stays full and productive.

---

### 4. How to Verify

On Linux with `perf`:

```bash
g++ -O2 -o test test.cpp
perf stat -e branches,branch-misses ./test
```

Unsorted: ~50% branch-miss rate. Sorted: ~0.00001%.

---

### 5. The Real Fix: Eliminate the Branch Entirely

Rather than relying on data ordering, make the code **branchless**. The ternary version is the cleanest — GCC/Clang compile it to a `CMOV` (conditional move) instruction, which has no pipeline flush:

```cpp
// Branchy (sensitive to data order)
if (data[c] >= 128) sum += data[c];

// Branchless: compiler emits CMOVxx — no misprediction possible
sum += (data[c] >= 128) ? data[c] : 0;
```

Verify with:
```bash
g++ -O2 -S -o test.s test.cpp
grep -i cmov test.s   # should find a cmovge or similar
```

The resulting assembly:
```asm
xor     edx, edx
cmp     eax, 128
cmovge  edx, eax    ; no branch — just a conditional register copy
add     rsi, rdx
```

**Performance comparison:**

| Version | Random Data | Sorted Data |
|---|---|---|
| Original (branchy) | ~11.5s | ~1.9s |
| Branchless ternary | ~1.9s | ~1.9s |

The branchless version matches sorted performance regardless of data order.

---

### 6. Why Java Shows the Same Effect (But Less Pronounced)

Java's HotSpot JIT compiles bytecode to the same native x86 machine code, running on the same physical CPU pipeline — so branch misprediction penalties are identical hardware events.

It's **less pronounced** because:
- JVM overhead (GC, safepoint checks, bounds checks) adds a constant floor to both runs, shrinking the ratio
- HotSpot C2 sometimes auto-emits `CMOV` for simple ternary patterns, partially eliminating the branch
- The warm-up phase (interpreter + JIT compilation) runs before your timed region, blurring measurements

The key insight: this is a **hardware phenomenon**, not a language one. No JIT can make a truly unpredictable branch predictable — it can only try to eliminate it.

---

**Bottom line:** The CPU is making wrong guesses 1.6 billion times and throwing away ~15–20 cycles of work each time. Sorting makes the pattern trivially predictable; branchless code makes the guess irrelevant.