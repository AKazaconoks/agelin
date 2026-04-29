<!-- after / bash-expert / so-487258-big-o / run 3 -->

**Duration**: 21.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(worst[- ]?case|upper[- ]?bound)/i | output did not match /(asymptotic|grows?\s+(as|with))/i | output did not match /(how\s+(time|the\s+number\s+of\s+operations)\s+(grows|scales))/i

---
Here's the explanation:

---

## Big O Notation — Plain English

**What it's for**

Big O notation is a way to describe how much slower your code gets as you feed it more data. It helps you predict whether your program will still work when you go from processing 100 items to 100,000 items. Some approaches scale gracefully — others fall apart completely.

**Why programmers care**

Because the difference between a good algorithm and a bad one is often the difference between your program finishing in seconds versus running for hours (or crashing entirely). It's about choosing the right tool for the job.

---

**O(n) — Linear time**

If you double your data, your program takes roughly twice as long.

> Like reading through a list of names to find "Smith" — if the list gets twice as long, it takes about twice as long to search.

**O(n²) — Quadratic time**

If you double your data, your program takes roughly *four times* as long.

> Like comparing every person in a room to every other person to find duplicates. With 10 people, that's 100 comparisons. With 20 people, that's 400 comparisons.

---

**The practical difference**

| Items | O(n) steps | O(n²) steps |
|-------|-----------|-------------|
| 1,000 | 1,000 | 1,000,000 |
| 10,000 | 10,000 | 100,000,000 |

Going from 1,000 to 10,000 items:
- O(n) gets **10x slower**
- O(n²) gets **10,000x slower**

That's why sorting algorithms matter. A bad sort on a large dataset can turn a one-second operation into hours of waiting, while a good sort keeps it manageable.

---

The notation strips away all the details and just tells you the *shape* of the problem — does it scale like a straight line, a gentle curve, or an exponential explosion?