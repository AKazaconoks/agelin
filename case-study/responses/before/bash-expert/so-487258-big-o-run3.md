<!-- before / bash-expert / so-487258-big-o / run 3 -->

**Duration**: 36.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(ignore|drop|discard)\s+(constants?|constant\s+factors?|lower[- ]?order\s+terms?)/i | output did not match /(constant\s+factors?\s+(don'?t|do\s+not)\s+matter)/i

---
Here's the explanation from the agent:

---

## Big O Notation: Plain English

### What is it for?

Big O describes **how much work an algorithm does as the input grows**. Think of it like a recipe: some scale gracefully, others fall apart when you double the batch.

---

### Why do programmers care?

Because the gap between a good and bad algorithm becomes *enormous* with real data.

Imagine a music app with a slow search:
- 100 songs → 0.1 seconds
- 100,000 songs → **100 seconds**

A better algorithm still finishes in 0.2 seconds. Big O is how you tell them apart *before* you ship to millions of users.

---

### What does O(n) mean?

Work grows **in direct proportion** to input size. Double the input, double the work.

**Analogy:** Reading a book page by page — 1,000 pages takes 10× as long as 100 pages.

**Code example:** Scanning an unsorted list for a name. If there are 10,000 names, you might check all 10,000.

---

### O(n) vs O(n²) — the practical difference

O(n²) means work grows with the *square* of the input. Here's what that looks like:

| n (input size) | O(n) operations | O(n²) operations |
|---|---|---|
| 100 | 100 | 10,000 |
| 1,000 | 1,000 | 1,000,000 |
| 10,000 | 10,000 | **100,000,000** |

**Analogy:**
- **O(n):** Everyone at a party shakes *your* hand — 100 people = 100 handshakes.
- **O(n²):** Everyone shakes *everyone else's* hand — 100 people ≈ 5,000 handshakes.

**In code:**
- O(n) — check if any number in a list equals 42: one pass, done.
- O(n²) — compare every number against every other to find duplicates: a nested loop, work explodes.

---

**Bottom line:** An O(n²) algorithm that feels fine at 100 items can take *hours* at 10,000 items, while O(n) still finishes in milliseconds. That's why Big O matters — it predicts where your code breaks under real-world load.