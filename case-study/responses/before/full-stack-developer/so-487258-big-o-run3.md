<!-- before / full-stack-developer / so-487258-big-o / run 3 -->

**Duration**: 41.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(input\s+size|size\s+of\s+(the\s+)?input|n\s+items?|n\s+elements?)/i | output did not match /(as\s+n\s+(grows|increases|gets\s+larger))/i

---
Here's the explanation from the agent:

---

## What it is for

Big O notation is a way of describing how the *work* an algorithm does grows as its input gets bigger. It is not about measuring exact speed — it is about the *shape* of growth.

Think of it like the difference between a recipe that takes twice as long if you double the guest count, versus one that takes four times as long. The clock time matters, but the *pattern* matters more.

---

## Why programmers care

Hardware speeds vary wildly — a laptop, a server, a phone all run the same code at different absolute speeds. But the *growth shape* of an algorithm stays the same regardless of hardware.

If you pick the wrong algorithm and your product takes off, you cannot just buy a faster server to escape the problem. The math catches up with you.

---

## What O(n) means

"n" is just the size of your input. O(n) says: **if the input doubles, the work roughly doubles too.** A straight line.

A classic example is searching an unsorted list for a name — no clever shortcut, you check each entry one by one. 1,000 names = up to 1,000 checks. 1,000,000 names = up to 1,000,000 checks.

---

## O(n) vs O(n²) in practical terms

O(n²) means the work grows with the *square* of the input. Double the input, work quadruples. Triple it, work grows ninefold.

**Concrete example — a "who knows whom" problem:** you want to check whether every person at a party knows every other person. For each person, you walk them up to every *other* person.

| People | O(n) work (hand out name tags) | O(n²) work (every pair intro) |
|--------|-------------------------------|-------------------------------|
| 10 | 10 steps | 100 steps |
| 100 | 100 steps | 10,000 steps |
| 1,000 | 1,000 steps | 1,000,000 steps |
| 10,000 | 10,000 steps | 100,000,000 steps |
| 100,000 | 100,000 steps | 10,000,000,000 steps |

At 100 people, the O(n²) algorithm is 100x heavier. At 10,000, it is 10,000x heavier. The gap doesn't just widen — it explodes.

The code-world version is a naive sorting algorithm like Bubble Sort. With 100,000 items it makes ~10 billion comparisons. A smarter sort (Merge Sort, O(n log n)) handles the same 100,000 items in roughly 1,700,000 operations. Same problem, radically different growth shape.

---

**One-sentence summary:** Big O tells you not how fast your code runs today, but **how badly it will slow down tomorrow** when the data gets bigger — and that is usually the more important question.