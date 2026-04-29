<!-- after / bash-expert / so-200469-process-vs-thread / run 1 -->

**Duration**: 96.0s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 95.99s > 60s

---
Here is the full breakdown:

---

## Processes vs. Threads: A Technical Breakdown

The confusion is real — "process" appears in at least three different layers of the stack. Here's what each construct actually *owns* vs. *shares*, and why it matters in code.

---

### 1. OS Process — unit of isolation

The kernel allocates these **exclusively** per process:

- Virtual address space (256 TB on 64-bit Linux)
- PID and parent-child relationships
- File descriptor table (limit ~1024 on Linux)
- Signal disposition table
- Working directory, environment variables
- Security context (UID, GID, capabilities)

**Creation cost:** `fork()` costs ~100–500 µs — copying page tables (even with CoW), allocating a new PID, new file-descriptor table, setting up kernel address-space structures.

**Why it matters:** A crash in one process cannot corrupt another's memory. But communication between processes is explicit: pipes, sockets, or `mmap(MAP_SHARED)`.

---

### 2. OS (Software) Thread — unit of scheduling

Created via `pthread_create()` or `clone()` inside the same process. The kernel schedules these.

**Each thread owns exclusively:**
- Stack (8 MB default on Linux, 1 MB on Windows, 512 KB on macOS)
- Register state: instruction pointer, stack pointer, general-purpose registers
- Thread-local storage (`__thread` variables)
- Signal mask

**Shared with all siblings in the process:**
- Heap, globals, static variables
- Code segment
- File descriptors (fd opened in thread A is visible in thread B)
- Memory mappings, shared libraries

**Creation cost:** ~10–50 µs — no new address space needed.
**Context-switch cost:** ~1–5 µs (kernel entry, register save/restore, possible TLB flush).

---

### 3. Hardware Thread (Hyper-Threading / SMT) — CPU-level

Intel HT and AMD SMT give each physical core two logical cores. Each HW thread has its own:

- Architectural register file (PC, 16 GP registers, flags)
- ROB (reorder buffer) slots, rename buffer entries

But **shared** with its HW sibling:
- ALUs, FPU, load/store units
- L1 cache (32 KB typical), L2 cache
- TLB, branch predictor

**Critical implication:** Two compute-bound threads on the same physical core are **not** truly parallel — they fight over the same ALUs. Expect 0–30% throughput gain from SMT on CPU-bound code, not 2×. Memory-bound workloads benefit more because one thread computes while the other waits for RAM.

**Context-switch cost:** ~0 cycles — just swapping which register set feeds the execution units.

---

### 4. Green / User-space Threads — runtime-scheduled

Scheduled by the language runtime, not the OS.

| Runtime | Initial stack | Creation cost |
|---|---|---|
| Go goroutine | 2–8 KB | ~100–500 ns |
| Java virtual thread (JDK 21) | ~300 bytes | no syscall |
| Erlang process | ~2.6 KB | ~1 µs |
| Python asyncio coroutine | ~1 KB (Python object) | trivial |

These map M user-space threads onto N OS threads (M:N scheduling). They share the heap and everything the OS process shares.

**Gotcha — blocking syscalls:** If a green thread calls a blocking syscall, what happens depends on whether the runtime intercepts it:
- **Go:** runtime intercepts `read()`/`write()`, parks the goroutine, moves the OS thread to another goroutine. Safe.
- **Python asyncio:** does **not** intercept — a blocking `read()` inside a coroutine freezes the entire event loop until it returns.

---

### 5. Why it matters when you write code

**Data races:** OS threads share the heap, so unprotected concurrent writes are undefined behavior:
```c
int counter = 0;
void* worker(void* _) {
    for (int i = 0; i < 1000000; i++)
        counter++;  // RACE — needs atomic or mutex
}
```
Separate processes can't race unless you explicitly create shared memory.

**CPU-bound parallelism and SMT pinning:**
```bash
# These two threads share a physical core — compete for ALUs
taskset -c 0,1 ./compute_heavy

# These two use different physical cores — truly parallel
taskset -c 0,2 ./compute_heavy
```

**Context-switch cost hierarchy (fastest → slowest):**

| Switch type | Cost |
|---|---|
| HW thread switch | ~0 (in-core register swap) |
| Green thread switch | ~10–100 ns (runtime scheduler) |
| OS thread switch | ~1–5 µs (kernel, TLB may flush) |
| Process switch | ~5–30 µs (full address space swap + TLB flush) |

**Memory overhead:**

| Unit | Stack/overhead |
|---|---|
| OS process | ~8 MB minimum |
| OS thread | ~8 MB stack + ~8 KB kernel structures |
| Go goroutine | ~2–8 KB |
| Java virtual thread | ~300 bytes |

---

**TL;DR mental model:**

- **Process** = isolated container (owns address space, FD table, credentials). Cross-process sharing is explicit and safe.
- **OS thread** = concurrent executor inside a process. Shares the heap — you must synchronize.
- **HW thread** = two register sets sharing one core's ALUs. Not truly parallel on compute-bound work.
- **Green thread** = cheap, runtime-managed concurrency. Watch out for blocking syscalls swallowing the OS thread underneath.