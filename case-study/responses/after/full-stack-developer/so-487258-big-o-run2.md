<!-- after / full-stack-developer / so-487258-big-o / run 2 -->

**Duration**: 40.9s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(ignore|drop|discard)\s+(constants?|constant\s+factors?|lower[- ]?order\s+terms?)/i | output did not match /(constant\s+factors?\s+(don'?t|do\s+not)\s+matter)/i

---
Here's the full explanation:

---

## What is Big O notation for?

Big O answers the question: **"How does the amount of work grow as the problem gets bigger?"**

Think of it like a road trip rule. Saying "it takes 3 hours" only works for one specific trip. Saying "about 1 hour per 60 miles" lets you estimate *any* trip. Big O is that "per mile" rule, but for code. It ignores hardware specifics and focuses on the *shape* of the growth curve.

---

## Why do programmers care?

Because the difference becomes **catastrophic at scale.**

A program that feels instant on 100 rows of data might take 45 minutes on a million rows — if you picked the wrong algorithm. Big O is how you spot that disaster *before* it ships.

It's also shared vocabulary. When someone says "that's O(n squared)," every programmer in the room immediately knows it's going to hurt at scale, without reading a single line of code.

---

## What does O(n) mean?

**n** is just "the size of your input" — the number of items.

O(n) means: **double the input, roughly double the work.** Linear growth.

Analogy: You're searching a guest list top-to-bottom for a name. 10 guests = 10 checks. 1,000 guests = 1,000 checks. Work scales directly with data.

---

## O(n) vs O(n²) — where it gets dramatic

O(n²) means work grows with the *square* of the input. Double the data, **quadruple** the work.

Analogy: Every guest at a party shaking hands with every other guest. 10 guests = 90 handshakes. 1,000 guests = ~1,000,000 handshakes.

| Items (n) | O(n) work | O(n²) work |
|---|---|---|
| 10 | 10 | 100 |
| 1,000 | 1,000 | 1,000,000 |
| 1,000,000 | 1,000,000 | 1,000,000,000,000 |

On a modern computer doing ~1 billion ops/sec:
- O(n) on 1 million items → **~1 millisecond**
- O(n²) on 1 million items → **~11 days**

The classic O(n²) trap is a loop inside a loop:

```python
for each person in the list:           # runs n times
    for each other person in the list: # runs n times again
        check if they know each other
```

Every new person added makes the inner loop run through the whole list again — that's the squaring effect.

---

**One-line summary:** Big O tells you not *how fast* code runs today, but *how badly it slows down* as data grows. O(n) scales politely. O(n²) eventually catches fire.