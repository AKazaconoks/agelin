<!-- before / electron-pro / so-200469-process-vs-thread / run 3 -->

**Duration**: 130.2s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 130.19s > 60s

---
Here's the full breakdown from the agent:

---

## Processes, Threads, and Hardware Threads: A Precise Technical Breakdown

---

### 1. The Hardware Layer: SMT / Hyper-Threading

A physical CPU core is a pipeline of execution units: fetch, decode, execute, write-back. At any instant, one stream of instructions flows through it.

**Simultaneous Multi-Threading (SMT)** — Intel calls this Hyper-Threading — duplicates the *architectural state* of the core while sharing the *execution resources*. Concretely:

- **Duplicated per hardware thread:** Program Counter, general-purpose registers, flags register, stack pointer — the full architectural register file.
- **Shared between hardware threads on the same core:** ALUs, FPUs, load/store units, L1/L2 caches, branch predictor, reorder buffer, memory bus to L3.

Two hardware threads on one physical core are **not truly parallel** — they time-slice at the sub-cycle level, filling execution-unit stalls from one thread with work from the other. Typical real-world throughput gain: 15–30%, not 100%.

An "8-core/16-thread" CPU has 8 physical cores and 16 architectural register sets. The OS scheduler sees 16 logical CPUs.

**Coding implication:** When pinning threads to CPUs on an SMT system, two threads on the same physical core share cache and execution units in a way that two threads on different cores do not. For latency-sensitive or security-sensitive work (e.g., preventing side-channel leaks like L1TF/MDS), pin to distinct *physical* cores.

---

### 2. The OS Layer: Processes

A **process** is the OS's unit of *resource ownership and isolation*.

**What a process owns exclusively:**

| Resource | Detail |
|---|---|
| Virtual address space | Complete, MMU-enforced isolation. No process can read another's memory without exploits. |
| File descriptor table | FD 3 in process A is unrelated to FD 3 in process B. |
| Page table | Switching requires loading CR3 on x86, flushing the TLB. |
| PID, UID/GID, credentials | Security identity. |
| Signal handlers, working directory, resource limits | All inherited at fork, then independent. |

**Sharing between processes:** Nothing by default. Requires explicit IPC — shared memory (`mmap MAP_SHARED`, `shm_open`), pipes, sockets.

**`fork()` semantics:** Creates a copy with **copy-on-write (COW)** — the page table initially maps to the same physical pages. The first write by either process triggers a page copy. Cheap to call, potentially expensive when the child starts writing heavily.

---

### 3. The OS Layer: Threads (Software Threads)

A **thread** is the OS's unit of *scheduling*. Created with `clone()` on Linux, `CreateThread()` on Windows, or `std::thread`/`pthread_create` wrappers.

**What a thread owns exclusively:**

| Resource | Detail |
|---|---|
| Stack | Allocated in the process's virtual address space; typically 1–8 MB default. |
| Register save area | Saved to `task_struct` (Linux) or `KTHREAD` (Windows) when not running. |
| Thread-local storage (TLS) | `thread_local` in C++, `pthread_getspecific`. `errno` is TLS — that's why it's thread-safe. |
| Signal mask | Which signals this thread accepts. |

**What threads share with all siblings in the same process:**

- The entire virtual address space — any pointer valid in one thread is valid in every thread. **No hardware isolation.**
- File descriptor table — closing FD 5 in one thread closes it process-wide.
- Heap (`malloc`/`new`).
- Code segment, read-only data, memory-mapped regions.

---

### 4. Comparison Table

| Property | Hardware Thread (SMT) | OS Thread | OS Process |
|---|---|---|---|
| Unit of | Sub-core scheduling | CPU scheduling | Resource ownership |
| Address space | Shared with core sibling | Shared with all process threads | Private, MMU-isolated |
| Register file | Own copy | Saved/restored on switch | Saved/restored on switch |
| Stack | Own (architectural SP) | Own (in VA space) | Own |
| File descriptors | N/A | Shared with process | Private table |
| Context switch cost | Sub-cycle (hardware) | ~1–10 µs | ~10–100 µs + TLB flush |
| Isolation | None | None | Strong (MMU-enforced) |
| Communication | Shared cache | Shared memory (direct pointer) | Explicit IPC only |

---

### 5. Why This Drives Code Decisions

**Locking and race conditions**

Threads share memory, so any concurrent write to a non-atomic variable is a data race — undefined behavior in C++, and corruption in every other language:

- Reads and writes to ordinary variables are **not atomic**, even word-sized ones. Compilers reorder them; CPUs reorder them; caches make them invisible to other cores until a memory barrier fires.
- A **mutex** prevents concurrent execution of a critical section — but only if you acquire it consistently.
- An **`std::atomic<T>`** gives hardware-guaranteed atomicity for a single variable's operations without a full lock. Coordinating two variables still needs a mutex.
- **Lock-free ≠ no synchronization.** It means no blocking. It still requires `std::atomic` with explicit memory order parameters, and getting it wrong is one of the hardest bug classes to reproduce.

Between processes, there's no accidental shared memory — races through memory are impossible unless you explicitly opt in with a shared memory segment.

**Context switching cost**

A thread switch within a process:
1. Save current register file + stack pointer to kernel's thread struct.
2. Restore next thread's register file + stack pointer.

A process switch additionally:
3. Write new page table base to CR3 — flushing the TLB on systems without PCID.
4. Switch kernel-level resource pointers (file table, signal table).

TLB misses after a process switch are expensive because they require walking the page table in memory. This is why high-concurrency servers (nginx, Go, Node.js) work hard to minimize process switches.

**Goroutines / green threads** (Go, Java virtual threads) are M:N scheduled in user space — no syscall, no TLB involvement. A goroutine switch costs ~100–300 ns vs. ~1–10 µs for an OS thread switch.

**The architectural choice**

Use **separate processes** when you need:
- Fault isolation (a crash in one doesn't corrupt others — Chrome's renderer model)
- Security isolation (untrusted code, seccomp sandboxing)
- Independent deployment or language heterogeneity

Use **threads** when you need:
- Low-latency data sharing (no copy, no pipe round-trip)
- High-frequency coordination (lock acquisition = nanoseconds; pipe round-trip = microseconds)

The cost of threads is **programmer burden**: you own all the correctness guarantees the OS would otherwise provide for free through address-space separation.

**NUMA and affinity**

On multi-socket systems, a thread on socket 0 accessing memory allocated on socket 1 crosses an inter-socket interconnect (~100 ns penalty). Keeping threads on the same NUMA node as their data is critical for throughput-sensitive workloads. At the SMT level, two threads on the same physical core evict each other's cache lines if their working sets differ — for real-time or latency-critical code, one thread per physical core with the SMT sibling idle is a common optimization.

---

**One-paragraph summary:** A *hardware thread* is a duplicated register file that lets one physical core appear as two logical CPUs to the OS, sharing execution units and caches — it buys throughput from stall-filling, not true parallelism. An *OS process* is the kernel's unit of resource ownership: private virtual address space, private FD table, MMU-enforced isolation from everything else. An *OS thread* is the kernel's unit of scheduling within a process: it owns only its stack, register save area, and TLS — everything else is shared with siblings, which is why multithreaded code requires explicit synchronization for all mutable shared state. Context switches between threads are cheaper than between processes primarily because they avoid TLB flushes. The choice between threads and processes is fundamentally: **isolation vs. communication cost**.