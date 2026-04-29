<!-- after / bash-expert / so-487258-big-o / run 1 -->

**Duration**: 27.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(worst[- ]?case|upper[- ]?bound)/i | output did not match /(asymptotic|grows?\s+(as|with))/i | output did not match /(how\s+(time|the\s+number\s+of\s+operations)\s+(grows|scales))/i

---
Here's the explanation from the agent:

---

## Big O Notation — Plain English

**What is it for?**

Big O is a way to describe how much slower your code gets as you give it more data. Think of it like a speedometer for algorithms — it tells you whether your code can handle 1,000 items or 1,000,000 items without grinding to a halt.

**Why do programmers care?**

Because the difference between good and bad algorithms becomes *massive* with real-world data. A bad algorithm might work fine with 10 items but take hours with 10,000. Big O helps you spot those disasters before they happen.

**What does O(n) mean?**

O(n) means: "if you double the input size, the time roughly doubles too."

Imagine reading through a phone book to find someone. 100 pages takes 5 minutes, 200 pages takes ~10 minutes. That's O(n) — linear growth. The `n` just stands for "however many items you have."

**O(n) vs O(n²) — the practical difference**

O(n²) means "if you double the input, the time goes up by 4x."

Concrete numbers:

| Input size | O(n) | O(n²) |
|---|---|---|
| 100 items | 100 steps | 10,000 steps |
| 1,000 items | 1,000 steps | 1,000,000 steps |
| 10,000 items | 10,000 steps | 100,000,000 steps |

**Real-world analogy:**
- **O(n)** is painting a fence — twice the fence, twice the time.
- **O(n²)** is everyone at a party shaking hands with everyone else — double the guests means *four times* the handshakes.

The bottom line: O(n) scales gracefully. O(n²) becomes unusable with large datasets. That's why experienced programmers obsess over Big O — it's the difference between code that works and code that crashes your server.