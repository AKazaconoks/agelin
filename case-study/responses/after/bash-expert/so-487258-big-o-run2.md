<!-- after / bash-expert / so-487258-big-o / run 2 -->

**Duration**: 27.4s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(worst[- ]?case|upper[- ]?bound)/i | output did not match /(asymptotic|grows?\s+(as|with))/i | output did not match /(how\s+(time|the\s+number\s+of\s+operations)\s+(grows|scales))/i

---
## Big O Notation — Plain English

Big O notation is a way to describe **how much slower your program gets as you give it more data**.

Think of it like describing a car's fuel efficiency based on how much luggage you pack. Big O tells you the *pattern* of how things slow down — not the exact speed.

---

### Why do programmers care?

Because the difference between a good algorithm and a bad one can mean the difference between your app responding instantly or taking hours. When you're dealing with thousands or millions of items, a poorly chosen approach can make a program unusable.

It helps you answer: *"Will this still work well when I have 10x more users?"*

---

### What does O(n) mean?

**Linear time** — if you double your data, it takes roughly twice as long.

Like reading a phone book to find someone. 100 people → 2 minutes. 200 people → ~4 minutes. Proportional growth.

---

### O(n) vs O(n²) — the concrete difference

**O(n)** — checking if any name in a list starts with "A":
- 100 names → up to 100 checks
- 10,000 names → up to 10,000 checks

**O(n²)** — comparing every person to every other person to find shared birthdays:
- 100 people → 100 × 100 = **10,000 comparisons**
- 1,000 people → 1,000 × 1,000 = **1,000,000 comparisons**
- 10,000 people → 10,000 × 10,000 = **100,000,000 comparisons**

When your data grows 100x, the O(n) work grows 100x — but the O(n²) work grows **10,000x**. A program that runs fine on small data can completely freeze on real-world data if it has an O(n²) algorithm hidden inside it.

That explosion is exactly what Big O notation exists to warn you about before you write the code.