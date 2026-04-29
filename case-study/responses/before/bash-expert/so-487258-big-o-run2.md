<!-- before / bash-expert / so-487258-big-o / run 2 -->

**Duration**: 29.2s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(worst[- ]?case|upper[- ]?bound)/i | output did not match /(asymptotic|grows?\s+(as|with))/i | output did not match /(how\s+(time|the\s+number\s+of\s+operations)\s+(grows|scales))/i

---
Here's the explanation from the agent:

---

## Big O in Plain English

**What it's for**

Big O notation describes how much slower your program gets as you give it more data. Think of it as asking: *"If I have twice as much work to do, how much longer will it take?"*

**Why programmers care**

You want to know: "Will this still work when my users give me a million records instead of a thousand?" A program that's fast with 100 items might become unusably slow with 100,000 items if the algorithm doesn't scale well.

---

**What O(n) means**

O(n) means: *double the input, double the work.* The `n` is just the size of your data.

Example: Scanning a contacts list to find a phone number. 100 contacts = ~50 checks on average. 200 contacts = ~100 checks. Linear, predictable growth.

---

**O(n) vs O(n²) — the practical difference**

O(n²) means: *double the input, and the work quadruples.*

| Items | O(n) steps | O(n²) steps |
|-------|-----------|-------------|
| 10    | 10        | 100         |
| 100   | 100       | 10,000      |
| 1,000 | 1,000     | 1,000,000   |

**Analogy:**
- **O(n):** Reading every book in a library once — double the books, double the time.
- **O(n²):** Comparing every book against every other book — double the books, four times the work.

At 1,000 items, O(n) might finish in 1 second. O(n²) could take 17 minutes. At 10,000 items, O(n) takes 10 seconds — O(n²) could take nearly 3 hours.

This is why experienced programmers get nervous when they see **nested loops** — they often create O(n²) situations that seem fine in testing but become disasters when real users throw larger datasets at them.