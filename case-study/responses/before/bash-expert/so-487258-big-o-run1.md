<!-- before / bash-expert / so-487258-big-o / run 1 -->

**Duration**: 34.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(worst[- ]?case|upper[- ]?bound)/i | output did not match /(asymptotic|grows?\s+(as|with))/i | output did not match /(how\s+(time|the\s+number\s+of\s+operations)\s+(grows|scales))/i

---
Here's the explanation from the agent:

---

## Big O in Plain English

### What is it for?

Big O is like a **warning label for algorithms**. It answers one simple question: *"How much slower will my program get as I give it more data?"*

It's not about exact timing — it's about the **pattern of slowdown**. Will your code take twice as long with twice the data? Or four times as long?

---

### Why do programmers care?

Because the difference between a good and bad algorithm becomes **massive** at scale.

Sorting 100 documents? A slow method is annoying but fine. Sorting 100,000 documents? That same method might take weeks, while a better one finishes in minutes. Programmers care because software has to keep working when data grows into the millions or billions.

---

### What does O(n) mean?

O(n) means **time grows at the same rate as your data** — linear growth.

Think of reading a book aloud:
- 100 pages → 5 hours
- 200 pages → 10 hours
- 1,000 pages → 50 hours

Double the pages, double the time. That's O(n). A programming example: scanning every item in a list to find the most expensive one.

---

### O(n) vs O(n²) — the practical difference

O(n²) means **doubling your data makes it take four times as long**, not twice.

| Items | O(n) | O(n²) |
|-------|------|--------|
| 1,000 | 1 second | ~17 minutes |
| 10,000 | 10 seconds | ~28 hours |
| 100,000 | 1.5 minutes | ~116 days |

A real-world O(n²) example: comparing every person in a room with every other person to find shared birthdays.
- 10 people → 45 comparisons
- 100 people → 4,950 comparisons
- 1,000 people → ~500,000 comparisons

**The takeaway:** O(n) stays manageable. O(n²) explodes. That's why programmers hunt for O(n) solutions — an algorithm that seems fine in testing can bring a server to its knees in production.