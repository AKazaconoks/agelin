<!-- after / electron-pro / so-487258-big-o / run 3 -->

**Duration**: 34.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(input\s+size|size\s+of\s+(the\s+)?input|n\s+items?|n\s+elements?)/i | output did not match /(as\s+n\s+(grows|increases|gets\s+larger))/i

---
Here's the plain-English breakdown:

---

## What is Big O notation for?

It answers one question: **"How does my program slow down as data grows?"**

It ignores hardware details and focuses purely on the *shape* of the relationship between data size and time — a label for the growth curve.

---

## Why do programmers care?

Because a bad algorithm that feels instant on 100 records can take hours on 10 million. Big O lets you spot that problem before you write a line of code — the difference between "this is fine" and "this will collapse under real load."

---

## What does O(n) mean?

**n** = however many things you have. O(n) = *double the data, roughly double the time.* Linear growth.

Example: scanning a list of names top-to-bottom looking for "Sarah." 10 names → up to 10 checks. 10,000 names → up to 10,000 checks. Straight line.

---

## O(n) vs O(n²) in practice

O(n²) happens when you loop over every item *for* every item — like introducing every guest at a party to every other guest. The work grows as a square.

| Data size (n) | O(n) steps | O(n²) steps |
|---|---|---|
| 10 | 10 | 100 |
| 100 | 100 | 10,000 |
| 1,000 | 1,000 | 1,000,000 |
| 10,000 | 10,000 | 100,000,000 |

At 10 items, who cares. At 10,000 items, you've gone from ten thousand operations to a hundred **million**. That's the difference between milliseconds and your app freezing.

---

**One-line takeaway:** Big O isn't about precision — it's about catching the algorithms that seem fine today but quietly destroy you when real data shows up.