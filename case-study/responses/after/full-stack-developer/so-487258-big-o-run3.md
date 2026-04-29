<!-- after / full-stack-developer / so-487258-big-o / run 3 -->

**Duration**: 43.5s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(worst[- ]?case|upper[- ]?bound)/i | output did not match /(asymptotic|grows?\s+(as|with))/i | output did not match /(how\s+(time|the\s+number\s+of\s+operations)\s+(grows|scales))/i

---
Here's the explanation:

---

## Big O Notation, Explained Simply

### What is it for?

Big O notation describes **how code slows down as you give it more work to do.**

Think of a road trip: the question isn't "how fast is the car?" — it's "if I double the distance, what happens to the travel time?" Big O answers that for code.

It ignores small details (CPU speed, disk speed) and focuses on the **shape of the growth**: does doubling the input double the work? Quadruple it? Or make almost no difference?

---

### Why do programmers care?

Because the difference between a good and bad algorithm is **invisible on small data and catastrophic on large data.**

Two approaches to searching a contact list might feel identical when testing with 100 contacts. One might take 11 days with 1,000,000 contacts. Big O is the tool that tells you which is which *before* you ship it to real users.

---

### What does O(n) mean?

`n` just means "the size of your input." O(n) means: **if you double the input, the work roughly doubles.** A straight line.

**Example — searching an unsorted list:** you have 1,000 names and look for "Zara". If she's not there, you check every single name. 10,000 names → 10,000 checks. Ten times the data, ten times the work. Predictable and honest.

**Analogy:** reading a book to find a sentence. Longer book, proportionally longer search.

---

### O(n) vs O(n²) — the practical difference

O(n²) means: **double the input, quadruple the work.** It comes from nested loops.

**Example — finding duplicate names:** take the first name, compare it against all others (n steps). Take the second name, compare against all others (n steps). Do this for every name → n × n = n² total comparisons.

**The numbers that make this real:**

| List size (n) | O(n) steps | O(n²) steps |
|---|---|---|
| 100 | 100 | 10,000 |
| 1,000 | 1,000 | 1,000,000 |
| 10,000 | 10,000 | 100,000,000 |
| 100,000 | 100,000 | 10,000,000,000 |

At 100,000 items: O(n) finishes in a fraction of a millisecond. O(n²) takes around **10 seconds** — and gets dramatically worse from there.

**Analogy:** at a party, shaking hands with everyone is O(n). Every *pair* of guests shaking hands with each other is O(n²). With 10 guests that's 45 handshakes. With 1,000 guests it's nearly 500,000. The party never ends.

---

**One-line summary:** Big O tells you not how fast your code is today, but how badly it will behave tomorrow when the data gets bigger. O(n) is a straight road. O(n²) is a cliff.