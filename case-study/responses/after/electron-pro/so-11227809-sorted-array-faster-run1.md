<!-- after / electron-pro / so-11227809-sorted-array-faster / run 1 -->

**Duration**: 97.7s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 97.68s > 90s

---
## Branch Prediction: Why Sorted Data is ~6x Faster

---

### 1. The Root Cause

The inner loop contains this conditional:

```cpp
if (data[c] >= 128) sum += data[c];
```

This is a **branch**. Modern CPUs don't wait to evaluate it before fetching the next instruction — they *speculatively execute ahead* using a **branch predictor**. When the predictor guesses wrong, it pays a heavy penalty. Sorted data makes prediction trivially easy; random data makes it nearly impossible.

---

### 2. How the Branch Predictor Works

#### Pipelining

Modern CPUs execute instructions in a multi-stage pipeline (fetch → decode → execute → write-back). At any moment, dozens of future instructions are already in-flight. The CPU cannot stall to wait for a branch condition — by the time it's resolved, the pipeline would be empty.

```
Without prediction (stall on every branch):
  Fetch | Decode | Execute | Write
  [if]  |        |         |        ← stall, stall, stall...
                 [if eval] |        ← now we know which path
                            [next]  ← 10-20 cycles wasted
```

#### Prediction

The CPU *guesses* the branch outcome and speculatively fills the pipeline:

```
With correct prediction (no stall):
  Fetch  | Decode | Execute | Write
  [if]   | [add]  | [loop]  | [...]  ← pipeline stays full
```

The predictor uses a **history table** — a cache of recent branch outcomes. Common strategies: 1-bit predictor, 2-bit saturating counter, tournament predictors (what modern Intel/AMD use).

#### Misprediction Penalty

When the predictor is wrong, the CPU must flush the incorrectly-fetched instructions and redirect. This costs **10–20 cycles** on modern x86. At 3 GHz ≈ 5 ns per misprediction. Across 100,000 × 32,768 iterations, this compounds into seconds.

---

### 3. Sorted vs. Unsorted: Prediction Quality

#### Unsorted data — the coin-flip case

`data[c]` is uniform random in [0, 255]. The branch `data[c] >= 128` is true ~50% of the time with no pattern. The predictor sees:

```
T, N, T, T, N, T, N, N, T, N, ...   (T=taken, N=not-taken)
```

No algorithm can do better than ~50% accuracy on truly random data. With a 50% miss rate and ~15-cycle penalty:

```
32768 × 50% miss × 15 cycles × 100,000 outer iters ≈ 24.5 billion wasted cycles
```

That's where the 11.54 seconds goes.

#### Sorted data — the predictor's dream

After sorting, data looks like:

```
[0, 0, ..., 127, 128, ..., 255]
```

The branch is **not-taken** for the first ~16,384 elements, then **taken** for the rest. The predictor sees a long run of `N`s, then a long run of `T`s. There is exactly **one** misprediction per outer loop iteration — at the single N→T transition. Essentially zero penalty. Hence 1.93 seconds.

---

### 4. Eliminating the Branch Entirely

The cleanest fix is **branchless code** — compute the result arithmetically so the CPU never needs to predict anything.

#### The bitwise mask trick

```cpp
// Arithmetic right-shift fills all bits with the sign bit.
// (data[c] - 128) >> 31  gives:
//   0xFFFFFFFF if data[c] < 128  (negative, sign bit = 1)
//   0x00000000 if data[c] >= 128 (non-negative, sign bit = 0)
//
// ~t flips it: 0xFFFFFFFF when >= 128, 0x00000000 when < 128
// ANDing with data[c] conditionally zeroes it — no jump instruction.
sum += data[c] & ~((data[c] - 128) >> 31);
```

#### Full rewritten loop (no sort needed)

```cpp
#include <algorithm>
#include <ctime>
#include <iostream>

int main() {
    const unsigned arraySize = 32768;
    int data[arraySize];
    for (unsigned c = 0; c < arraySize; ++c) data[c] = std::rand() % 256;

    // No sort needed — branchless is fast on any data order.

    clock_t start = clock();
    long long sum = 0;
    for (unsigned i = 0; i < 100000; ++i) {
        for (unsigned c = 0; c < arraySize; ++c) {
            int t = (data[c] - 128) >> 31;  // all-zeros or all-ones mask
            sum += data[c] & ~t;            // data[c] or 0, no branch
        }
    }

    double elapsedTime = static_cast<double>(clock() - start) / CLOCKS_PER_SEC;
    std::cout << elapsedTime << std::endl;
    std::cout << "sum = " << sum << std::endl;
}
```

#### Alternative: ternary that compilers auto-vectorize

```cpp
// GCC/Clang at -O2 often emit a CMOV (conditional move) here, not a jump:
sum += (data[c] >= 128) ? data[c] : 0;
```

Check the assembly with `g++ -O2 -S`. A `cmovl` instruction selects between two values without redirecting the instruction pointer — no pipeline flush, no predictor involved.

```asm
; Branchy (-O0):         vs.    Branchless (-O2):
    cmp  eax, 128                  cmp  eax, 128
    jl   .skip          ← guess   cmovl eax, edx   ← no jump
    add  rbx, rax                  add  rbx, rax
.skip:
```

---

### 5. The Java Analogy

The same effect appears in Java because HotSpot's JIT compiles hot loops to native machine code running on the **same physical CPU** with the **same branch predictor**. The JVM abstraction doesn't shield you from microarchitectural reality. The effect is just slightly less pronounced because the JIT sometimes auto-optimizes the branch.

---

### Summary

| Scenario | Miss rate | Wasted cycles | Time |
|---|---|---|---|
| Unsorted + branch | ~50% | ~24.5 billion | 11.54 s |
| Sorted + branch | ~0% | negligible | 1.93 s |
| Branchless (any order) | N/A | 0 | ~1.9 s |

**The lesson:** branch misprediction is one of the most expensive per-operation costs on a modern out-of-order CPU. When a hot loop's branch is data-dependent and unpredictable, rewrite it to be branchless rather than relying on data ordering as a workaround.