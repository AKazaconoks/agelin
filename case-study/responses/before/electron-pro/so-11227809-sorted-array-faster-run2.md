<!-- before / electron-pro / so-11227809-sorted-array-faster / run 2 -->

**Duration**: 157.8s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 157.77s > 90s

---
## Branch Prediction: Why Sorting Makes the Loop ~6x Faster

This is one of the most famous examples of CPU microarchitecture dominating algorithmic performance. The sort itself is irrelevant — the speedup is entirely about how the **hardware branch predictor** interacts with your data pattern.

---

### The Root Cause: The Pipelined CPU Must Guess

Modern CPUs execute instructions through a deep pipeline (14–19 stages on Intel). At the **Fetch** stage, the CPU doesn't yet know the outcome of `if (data[c] >= 128)` — that isn't evaluated until the **Execute** stage, ~15 cycles later.

The CPU must **speculate**: it guesses which path to fetch and starts executing it. If it guesses wrong, it must **flush the pipeline** — discarding all speculative work — and restart from the correct path. This penalty is ~15–20 cycles per misprediction on modern Intel CPUs.

---

### How the Branch Predictor Works

The **Branch Prediction Unit (BPU)** uses several layered mechanisms:

**2-bit Saturating Counters:**
```
States: SNT(00) → WNT(01) → WT(10) → ST(11)
- Taken outcome:     shifts right (toward ST)
- Not-Taken outcome: shifts left (toward SNT)
```
Two consecutive wrong predictions are needed to flip the prediction — this handles streaks but not random sequences.

**Two-Level Adaptive Prediction:** A **Branch History Register (BHR)** records the last N outcomes for a branch. Combined with the PC address, it indexes into a **Pattern History Table (PHT)** to exploit repeating patterns.

**TAGE (state of the art):** Multiple tables with geometrically increasing history lengths (4, 8, 16, 32, 64, 128 bits). The longest matching history wins. Achieves <1% misprediction on regular workloads.

---

### Unsorted Data: ~50% Misprediction Rate

With `rand() % 256`, values are uniformly distributed — ~50% are ≥ 128 and ~50% are < 128, in **random order**:

```
Branch outcomes: T, NT, T, T, NT, T, NT, NT, T, ...  (random)
```

No predictor can predict a truly random sequence better than 50/50. The BHR fills with a pattern that never repeats, so no PHT entry ever stabilizes.

```
Mispredictions ≈ 32768 × 100000 × 50% ≈ 1.6 billion
Wasted cycles  ≈ 1.6B × 15 ≈ 24.5 billion cycles (~8 sec of pure flush overhead)
```

This is consistent with the observed 11.54s.

---

### Sorted Data: ~0.001% Misprediction Rate

After `std::sort`, the array is:
```
[0, 0, ..., 127, 127, | 128, 128, ..., 255, 255]
Branch outcomes: NT, NT, NT, ..., NT,  T,  T, T, ..., T
```

The predictor sees two long, trivially predictable streaks. It saturates to **SNT** for the first half, then to **ST** for the second half. Only **~2 mispredictions per outer iteration** occur (at the NT→T transition and the loop exit).

```
Total mispredictions ≈ 100000 × 2 = 200,000
Wasted cycles        ≈ 200,000 × 15 ≈ 3M cycles (~0.001 sec)
```

The remaining ~1.93s is the actual memory loads and additions — the hardware's true computation limit.

---

### Assembly-Level View

The `if` statement compiles to a conditional jump:

```asm
; Branching version:
    mov    eax, DWORD PTR [rsi + rcx*4]   ; load data[c]
    cmp    eax, 128
    jl     .skip                           ; <-- THE BRANCH (mispredicts ~50% with random data)
    cdqe
    add    rbx, rax                        ; sum += data[c]
.skip:
```

---

### The Fix: Eliminate the Branch Entirely

**Option 1 — Arithmetic bitmask (always branchless):**
```cpp
for (unsigned c = 0; c < arraySize; ++c) {
    int t = (data[c] - 128) >> 31;  // all 1s if < 128, all 0s if >= 128
    sum += data[c] & ~t;             // passes data[c] through only when >= 128
}
```

**Option 2 — Ternary (compiler usually emits `cmovge`):**
```cpp
for (unsigned c = 0; c < arraySize; ++c) {
    sum += (data[c] >= 128) ? data[c] : 0;
}
```

The `cmovge` instruction is a **predicated move** — it reads both operands and selects one based on flags, with **no branch and no prediction needed**. You can verify with `g++ -O2 -S -masm=intel` and look for `cmov` vs `jl` in the output.

**Option 3 — AVX2 SIMD (8 integers/cycle, zero branches):**
```cpp
__m256i vdata = _mm256_loadu_si256((__m256i*)(data + c));
__m256i mask  = _mm256_cmpgt_epi32(vdata, _mm256_set1_epi32(127));
vsum = _mm256_add_epi64(vsum, /* masked vdata widened to 64-bit */);
```

---

### Performance Comparison

| Scenario | Misprediction Rate | Time | Bottleneck |
|---|---|---|---|
| Unsorted, `if` branch | ~50% | 11.54s | Pipeline flushes |
| Sorted, `if` branch | ~0.001% | 1.93s | Memory bandwidth |
| Branchless (`cmov`) | N/A | ~1.9s | Memory bandwidth |
| Branchless (AVX2) | N/A | ~0.25s | Memory bandwidth |

Note: **sorted and branchless achieve the same time** — because once you eliminate mispredictions, the bottleneck becomes the hardware's actual computation limit.

---

### Why Java Shows the Same Effect (Less Pronounced)

The **same physical branch predictor** in the CPU is responsible — once HotSpot's C2 JIT compiles the hot loop to native code (after ~10,000 invocations), it emits the same `cmp`/`jl` sequence as g++.

The effect is smaller in Java because:
1. **JIT warm-up:** Early iterations run through the interpreter and C1 compiler, which have their own overhead that masks the data branch cost.
2. **GC pauses:** Garbage collector pauses add latency noise that dilutes the signal.
3. **Profile-guided optimization:** HotSpot profiles branch outcomes and may emit `cmov`-based branchless code if it detects a highly variable branch.
4. **Auto-vectorization:** JDK 17+ HotSpot can auto-vectorize with SIMD via Superword Level Parallelism, making both sorted/unsorted faster and shrinking the ratio.

---

### The Mental Model

Think of the branch predictor as a **speculative worker** who starts the next task before being told which one to do, based on past experience. With random data, the worker is constantly told "wrong, stop, go back" — wasting 15 cycles of pipeline work each time. With sorted data, the pattern is trivially predictable and the worker is almost always right, keeping the pipeline full.

**The sorted array doesn't make the algorithm faster — it makes the hardware's speculative execution engine more effective.** That's an optimization operating entirely below the level of the algorithm itself.