<!-- after / bash-expert / so-11227809-sorted-array-faster / run 3 -->

**Duration**: 57.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Branch Prediction — Why Sorting Makes the Loop ~6x Faster

### Root Cause

Modern CPUs execute instructions through a **pipeline**: multiple stages (fetch, decode, execute) overlap so the CPU works on several instructions simultaneously. When the CPU hits a conditional branch like `if (data[c] >= 128)`, it doesn't wait to find out the result — it *guesses* (speculates) which path to take, then continues executing down that path speculatively.

This guess is made by the **branch predictor**, a hardware unit that tracks recent branch history to anticipate future outcomes.

- **Correct prediction** → no penalty, the speculative work is committed.
- **Wrong prediction** → the pipeline must be **flushed** (all speculative work discarded), and execution restarts from the correct path.

That flush costs **10–20 cycles** (~3–7 ns on a modern CPU). Over 3.2 billion iterations (100 000 × 32 768), even a modest misprediction rate is catastrophic.

---

### Why Random Data vs. Sorted Data

| Data | Branch outcome | Misprediction rate |
|------|---------------|-------------------|
| Random (0–255) | ~50% taken, ~50% not taken — no pattern | ~45–50% |
| Sorted (0…127, then 128…255) | Long run of "not taken", then long run of "taken" | ~0% (except at the transition point once) |

With **random data**, the branch predictor is essentially coin-flipping. Nearly every other iteration it guesses wrong and pays the flush penalty.

With **sorted data**, the predictor quickly learns the pattern. It mispredicts once around index 16 384 (the 128 threshold), then runs the entire remaining array perfectly.

---

### Branchless Rewrite

Eliminate the branch entirely — no branch means no misprediction, and performance becomes data-order-independent:

```cpp
for (unsigned i = 0; i < 100000; ++i) {
    for (unsigned c = 0; c < arraySize; ++c) {
        // (data[c] >= 128) evaluates to 1 or 0 — no branch
        sum += data[c] & -(data[c] >= 128);
    }
}
```

How the bitmask works:
- `data[c] >= 128` → `1` (true) or `0` (false)
- Negating: `-(1)` = `0xFFFFFFFF`, `-(0)` = `0x00000000`
- AND with `data[c]`: passes the value through when true, zeros it when false

Or more readably:

```cpp
sum += data[c] * (data[c] >= 128);
```

Both produce identical results to the original `if` version, but with consistent performance regardless of whether data is sorted or not.

---

### Why Java Shows the Same Effect (but Less Pronounced)

Java's JIT compiler (HotSpot) applies **profile-guided optimization** — it samples branch outcomes at runtime and can emit conditional-move instructions or rearrange code to reduce mispredictions. This mitigation partially masks the penalty, shrinking the speedup ratio to ~2–3x instead of ~6x. The underlying hardware phenomenon is identical; the JVM just fights back harder.

---

### Summary

```
Random data:  CPU predicts ~50% wrong → pipeline flushes → 11.54 s
Sorted data:  CPU predicts ~100% right → no flushes      →  1.93 s
Branchless:   No branch at all → always fast regardless of order
```

This is a textbook demonstration of why **data layout and access patterns** matter as much as algorithmic complexity for real-world performance.