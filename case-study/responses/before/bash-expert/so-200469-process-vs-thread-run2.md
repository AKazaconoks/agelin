<!-- before / bash-expert / so-200469-process-vs-thread / run 2 -->

**Duration**: 43.2s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /(own|separate)\s+stack/i | output did not match /(thread|threads)\s+(have|has)\s+(their\s+)?own\s+stack/i | output did not match /(context\s+switch|lighter|heavier|cheaper|more\s+expensive)/i

---
Here's the breakdown from the agent, with some framing to make it cohesive:

---

## Process

**Owns exclusively:** virtual address space, file descriptor table, PID, signal handlers, working directory, environment variables.

**Why this matters:** crashing one process cannot corrupt another's memory. IPC (pipes, sockets, shared memory) is required to communicate — there's no accidental sharing.

---

## Software Thread

**Owns exclusively:** its stack (local variables, call frames) and register state (saved when off-CPU).

**Shares with every other thread in the same process:** heap, globals, file descriptors, the code segment.

**Why this matters:** any thread can corrupt data any other thread is using. Every piece of shared mutable state needs synchronization (`mutex`, `atomic`, etc.), or you have a race condition:

```c
// Two threads incrementing the same global — classic race
int counter = 0;
// Thread A: reads 0, Thread B: reads 0, both write 1 → lost update
counter++;
```

---

## Hardware Thread (Hyper-Thread / SMT)

This is a physical CPU concept. One physical core can present two *hardware threads* to the OS. Each has its own program counter and register file, but they share the same execution units (ALUs), L1/L2 cache, and memory bus.

**Why this matters:** two hardware threads on one core compete for the same execution resources. Scheduling two CPU-bound software threads on the same physical core gives you much less than 2× throughput — sometimes barely 1.1×. Scheduling them on separate physical cores is genuinely parallel.

---

## The Practical Hierarchy

| | Isolation | Creation cost | Communication |
|---|---|---|---|
| **Process** | Full (separate address space) | High (~fork, exec) | Explicit IPC |
| **Software thread** | Shared memory, shared fate | Low | Direct (needs locks) |
| **Hardware thread** | Shares execution units | N/A (OS-visible core) | Cache coherency (automatic) |

**Rules of thumb when writing code:**

1. Use **processes** when you need fault isolation (a crash in one shouldn't kill another) or security boundaries.
2. Use **threads** when you need low-latency communication between concurrent units — but treat every shared variable as a liability.
3. Be aware of **hardware thread count** (`nproc --all` vs `nproc`) when tuning CPU-bound thread pools — more software threads than physical cores doesn't help and adds context-switch overhead.
4. On hardware with SMT, pinning two compute-heavy threads to the same core can actively hurt performance versus pinning them to separate physical cores.