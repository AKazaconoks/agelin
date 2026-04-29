<!-- before / electron-pro / so-487258-big-o / run 1 -->

**Duration**: 30.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(worst[- ]?case|upper[- ]?bound)/i | output did not match /(asymptotic|grows?\s+(as|with))/i | output did not match /(how\s+(time|the\s+number\s+of\s+operations)\s+(grows|scales))/i

---
Here's the explanation the agent put together:

---

## What is Big O notation for?

Big O is a way to describe **how fast a problem gets harder as it gets bigger.**

It's asking: "If I double the amount of work, does my program take twice as long? Ten times as long? The same amount?" Big O gives you a shorthand label for the answer. It ignores small details (fast vs. slow hardware) and just captures the *shape* of the growth.

---

## Why do programmers care?

Because **a bad algorithm can turn a fast computer into a slow one.**

Code that works fine with 100 users might grind to a halt with 100,000 — not because the hardware changed, but because the *approach* was fundamentally inefficient. Big O lets you spot that before it bites you in production.

---

## What does O(n) mean?

The "n" is just "the size of your input." O(n) means: **double the input, double the work.**

Example — searching a guest list for "Alice":

- 10 names → 10 checks
- 1,000 names → 1,000 checks

Straight line. Honest and predictable. Generally considered decent.

---

## O(n) vs. O(n²) — the practical difference

O(n²) means: **for every item, you do work on every *other* item.** Work doesn't grow in a line — it explodes.

Example — naively checking every pair of names for duplicates:

| List size (n) | O(n) work | O(n²) work |
|---|---|---|
| 10 | 10 | 100 |
| 100 | 100 | 10,000 |
| 1,000 | 1,000 | 1,000,000 |
| 10,000 | 10,000 | 100,000,000 |

Going from 10 to 1,000 names (100x more data) takes O(n) work from 10 to 1,000 — but takes O(n²) work from 100 to **1,000,000**. That's a 10,000x increase in work for a 100x increase in data.

At small sizes the difference is invisible. At real-world sizes, O(n²) can turn a millisecond operation into a minutes-long hang.

**The rule of thumb: O(n) scales. O(n²) often doesn't.**