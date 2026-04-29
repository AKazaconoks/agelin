<!-- before / electron-pro / so-487258-big-o / run 3 -->

**Duration**: 33.3s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(ignore|drop|discard)\s+(constants?|constant\s+factors?|lower[- ]?order\s+terms?)/i | output did not match /(constant\s+factors?\s+(don'?t|do\s+not)\s+matter)/i

---
Here is the explanation from the agent:

---

## What is Big O notation for?

Big O notation answers one simple question: **"If I give this program more work to do, how much slower does it get?"**

It is a shorthand for describing how a program *scales*. It does not tell you how fast something runs on your computer today. It tells you what happens as the problem gets bigger.

Think of it like predicting traffic. You don't need to know the exact travel time to know that "adding more cars to the road makes things worse." Big O tells you *how much* worse, and in what pattern.

---

## Why do programmers care?

Because a program that works fine with 100 users can completely fall apart with 10,000 users — and the *reason* it falls apart is almost always a scaling problem.

A program that takes 1 second to handle 100 records might take:
- **2 seconds** for 200 records if it scales well, or
- **40,000 seconds** for 200 records if it scales badly.

Both programs *look* fine during development. Big O is how you spot the second one before it blows up in production.

---

## What does O(n) mean?

The **n** just means "the size of your input." O(n) means: **as the input doubles, the work doubles.** It grows in a straight line.

Analogy: **reading a list of names out loud.**
- 10 names → 10 seconds
- 100 names → 100 seconds
- 1,000 names → 1,000 seconds

Every extra item costs exactly one more unit of work.

---

## O(n) vs O(n²) in practical terms

O(n²) means: **as the input doubles, the work quadruples.** It grows with the *square* of the input size.

Analogy: **introducing everyone at a party to every other person.** Adding one more guest doesn't add one more introduction — it adds one with *every single person already there.*

| Items (n) | O(n) steps | O(n²) steps |
|-----------|------------|-------------|
| 10 | 10 | 100 |
| 100 | 100 | 10,000 |
| 1,000 | 1,000 | 1,000,000 |
| 10,000 | 10,000 | **100,000,000** |

At 10 items the difference is almost nothing. At 10,000 items, O(n) is a fraction of a second and O(n²) is your program freezing entirely.

**Where O(n²) hides:** almost always inside a nested loop — a loop inside a loop. For every item you look at, you look at every *other* item too. It works fine in testing when data is small. It becomes a wall when data is real.

O(n) is a straight line going up. O(n²) is a curve that eventually goes nearly vertical. The bigger your data, the more brutally that difference matters.