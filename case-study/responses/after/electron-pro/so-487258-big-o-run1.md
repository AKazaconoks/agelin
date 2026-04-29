<!-- after / electron-pro / so-487258-big-o / run 1 -->

**Duration**: 39.9s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(worst[- ]?case|upper[- ]?bound)/i | output did not match /(asymptotic|grows?\s+(as|with))/i | output did not match /(how\s+(time|the\s+number\s+of\s+operations)\s+(grows|scales))/i

---
Here's the explanation:

---

## What is Big O for?

Big O notation describes **how much slower a program gets as you give it more work to do.**

It doesn't measure raw speed in seconds — it measures **how runtime grows** as input grows. Think of it like a recipe: cooking for 2 people is fine with almost anything, but cooking for 200 reveals which recipes scale and which don't.

---

## Why do programmers care?

Hardware can only save you so much. If your code is fundamentally inefficient, 10x more data next year can turn "runs in 1 second" into "runs in 100 seconds." Big O lets you spot those disasters before they happen.

---

## What does O(n) mean?

**n** = the size of your input. O(n) means: **if the input doubles, the work doubles.** A straight line.

Like reading names off a list out loud — 10 names takes 10 seconds, 1,000 names takes 1,000 seconds. One item, one unit of work, always.

| n | O(n) steps |
|---|---|
| 10 | 10 |
| 1,000 | 1,000 |
| 10,000 | 10,000 |

---

## O(n) vs O(n²) — where it gets real

O(n²) means you do something for every item *for every other item* — a loop inside a loop.

**Analogy:** A round-robin tournament. 10 players = 45 games. 1,000 players = nearly **500,000 games.** The number of games explodes even though players only grew 100x.

**Concrete numbers:**

| n | O(n) steps | O(n²) steps |
|---|---|---|
| 10 | 10 | 100 |
| 100 | 100 | 10,000 |
| 1,000 | 1,000 | **1,000,000** |
| 10,000 | 10,000 | **100,000,000** |

At n = 1,000, O(n) does 1,000 operations. O(n²) does **one million.** Same input, a thousand times more work.

---

**One-line takeaway:** O(n) grows politely. O(n²) grows explosively. Knowing which one you have is the difference between code that works in production and code that only works in demos.