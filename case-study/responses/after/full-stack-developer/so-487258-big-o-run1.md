<!-- after / full-stack-developer / so-487258-big-o / run 1 -->

**Duration**: 34.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(ignore|drop|discard)\s+(constants?|constant\s+factors?|lower[- ]?order\s+terms?)/i | output did not match /(constant\s+factors?\s+(don'?t|do\s+not)\s+matter)/i

---
## Big O Notation: Plain English

---

### What is it for?

Big O notation describes **how a piece of code's runtime grows as you give it more data**. Not the exact time — the *shape* of the growth. Will it stay flat? Double? Explode?

The "O" stands for "order of magnitude" — a ballpark category of growth.

---

### Why do programmers care?

Because **bad algorithms are invisible on small data but catastrophic on large data.**

Searching through 10 names? Almost any approach works fine. Searching through 10 million names? A bad approach takes hours; a good one takes milliseconds. Big O is the shorthand programmers use to ask: *"If I double the data, what happens to the time?"*

---

### What does O(n) mean?

`n` = the size of your input (number of items).

**O(n)** means: double the input → double the time. A straight-line relationship.

**Example:** You have a bag of raffle tickets in random order, looking for ticket #47. You pull them out one by one. 10 tickets = up to 10 checks. 1,000 tickets = up to 1,000 checks. One extra ticket, one extra check. That's O(n).

---

### O(n) vs O(n²) — the practical difference

**O(n²)** means: double the input → quadruple the time. The hallmark is a **loop inside a loop**.

**Example:** You have a list of people and want to find every pair who share a birthday. Naive approach — for each person, compare them against every other person.

| Items | O(n) steps | O(n²) steps |
|-------|-----------|-------------|
| 10 | 10 | 100 |
| 1,000 | 1,000 | 1,000,000 |
| 1,000,000 | 1,000,000 | 1,000,000,000,000 |

At a million items, O(n) is still manageable. O(n²) is one trillion steps — a computer doing a billion operations per second would take **~16 minutes**. Scale up a bit more and you're waiting days.

---

**One-sentence summary:** Big O tells you not how fast your code is *today*, but how badly it will age as your data grows — and the gap between a good and bad algorithm is often the difference between instant and impossible.