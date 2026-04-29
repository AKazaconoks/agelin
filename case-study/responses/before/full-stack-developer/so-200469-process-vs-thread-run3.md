<!-- before / full-stack-developer / so-200469-process-vs-thread / run 3 -->

**Duration**: 177.0s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 176.98s > 60s

---
Here is the full technical breakdown from the agent:

---

## Processes and Threads: The Real Picture

---

### 1. The Process: A Resource Container

A process is not a "running program" — it is a **resource container**. The kernel represents it with a **Process Control Block (PCB)** (`task_struct` in Linux, `EPROCESS` in Windows).

**What a process owns exclusively:**

- **Virtual Address Space** — implemented via a page table (4-level PML4 on x86-64). The CPU's MMU walks this table on every memory access not covered by TLB. Two processes at the same virtual address `0x7fff1234` point to *different physical memory* because they have different page tables. The OS switches page tables by writing a new value to the `CR3` register on every process context switch. Linux tracks address regions as **VMAs** (`vm_area_struct`): the heap is a VMA, the stack is a VMA, each mapped library is a VMA.
- **File Descriptor Table** — an array of pointers to open file descriptions. The table itself is per-process; underlying file descriptions can be shared via `fork()`.
- **Signal Disposition Table**, **PID/credentials/UID/GID**, **Resource limits (`rlimit`)**

---

### 2. The Thread: Execution Context Within a Process

A thread is an **execution context** that lives inside a process. On Linux, a thread is just another `task_struct` created with `clone(2)` using flags that cause it to *share* the parent's resources.

**What a thread owns exclusively:**

- **Register state (CPU context)** — RAX, RBX, RIP, RSP, RFLAGS, etc. This is saved/restored on every context switch. This is the thread's *execution identity*.
- **Stack** — a separate VMA in the shared address space. On Linux, `pthread_create` allocates this (default 8 MB). Critical: the stack lives in the *shared* address space — another thread can read it if it has the address. There is no hardware protection between thread stacks within the same process.
- **Thread-Local Storage (TLS)** — accessed via the `FS` segment register on x86-64, pointing to a per-thread data block.
- **Signal mask**, **scheduling state**

**What all threads in a process share:**

| Resource | Mechanism |
|---|---|
| Virtual address space | Same `mm_struct` / same `CR3` |
| Page tables | Same physical page table pages |
| File descriptor table | Same `files_struct` |
| Signal handlers | Same `sighand_struct` |
| Heap | Same VMAs (with internal locking in `malloc`) |
| UID/GID/credentials | Same `cred` |

The heap is shared but **not inherently thread-safe**. `malloc`/`free` use internal locks; your application data on the heap has no protection.

---

### 3. Linux `clone(2)`: The Unifying Syscall

Linux has no separate `fork()` vs `pthread_create()` at the syscall level — it has `clone(2)`:

```
fork()           → clone(SIGCHLD)
pthread_create() → clone(CLONE_VM | CLONE_FS | CLONE_FILES |
                          CLONE_SIGHAND | CLONE_THREAD | CLONE_SETTLS | ...)
```

`CLONE_VM` is the critical flag — it shares the `mm_struct` (page table root) instead of copying it. Without it, `fork()` must duplicate the page table (O(VMAs) work) and set up copy-on-write mappings. This is why thread creation is cheaper than process creation.

---

### 4. The Four Levels of "Thread"

**4a. OS (Kernel) Thread**
A schedulable entity the kernel knows about directly. Has a `task_struct`. Can be preempted at any point. Blocking one does not block others in the same process.

**4b. User-Space (Green) Thread / Goroutine / Fiber**
Scheduled by a *runtime scheduler in user space*, not the kernel. The kernel sees only N OS threads. The runtime multiplexes M green threads onto them (M:N scheduling).

- **Go goroutines**: The Go runtime uses `G` (goroutine), `M` (OS thread), and `P` (scheduling context). When a goroutine blocks on a syscall, the runtime detaches the `P` from the blocking `M` so another `M` can pick it up — no other goroutines stall. Goroutines start with 2–8 KB stacks that grow dynamically (no pre-committed 8 MB like OS threads).
- **JVM Virtual Threads (Java 21+)**: The JVM mounts/unmounts virtual threads on carrier OS threads. Blocking I/O unmounts the virtual thread; the carrier runs another. Note: `synchronized` blocks *pin* virtual threads to carriers (because JVM monitors are tied to OS thread identity); `ReentrantLock` does not.
- **The sharp edge**: A green thread that makes a raw blocking syscall blocks its entire carrier OS thread, stalling all green threads on it. Go and Loom mitigate this with runtime interception; naive implementations don't.

**4c. Hardware Thread (SMT / Hyperthreading)**
A physical core with SMT exposes 2+ logical processors. Each hardware thread owns its own register file and local APIC, but *shares* execution units, L1/L2 cache, TLB, and branch predictor state.

Implications:
- Two compute-bound threads on two SMT peers of the same core may get only ~1.3x speedup, not 2x.
- Shared branch predictor state is the microarchitectural foundation of Spectre-class side-channel attacks.

---

### 5. Why This Matters for Your Code

**Memory visibility**
Shared memory between threads is not automatically coherent from the programmer's perspective. Compilers reorder instructions; CPUs have out-of-order execution and store buffers. A write in one thread is not guaranteed visible in another without a synchronization operation (mutex acquire/release, `std::atomic`, `sync/atomic`, memory fence). This is what language memory models (C++11, JMM, Go memory model) formalize.

Between processes, there is no shared memory by default — you must explicitly create it (`shm_open`/`mmap MAP_SHARED`). And you cannot use process-local primitives there; you need `PTHREAD_PROCESS_SHARED` mutexes or platform equivalents.

**Synchronization cost**
An uncontended `pthread_mutex_t` on Linux is a pure user-space CAS — no syscall. On contention it calls `futex(2)` to block in the kernel. Cross-process mutexes require `FUTEX_SHARED` (hashed on physical address) or named semaphores.

**Context-switch cost — concrete numbers**

| Switch type | Cost |
|---|---|
| Thread (same process, no CR3 change) | ~1–10 µs |
| Process (different address space, TLB flush) | ~5–50+ µs (cache effects dominate) |
| Goroutine / green thread (user-space only) | ~100–300 ns |

This explains why a server handling 100,000 concurrent connections uses goroutines rather than OS threads — 100,000 OS threads would consume ~80 GB of stack space alone.

**Fault containment**
A thread with a wild pointer corrupts the entire process's heap — every other thread is now running on potentially corrupted state. A crashing thread kills the entire process.

A crashing process cannot corrupt another process's memory — the page table enforces this in hardware. This is why:
- Chrome puts each tab in a separate process (a compromised renderer can't read the browser's main process memory)
- PostgreSQL uses process-per-connection
- Apache prefork uses separate worker processes

**IPC overhead**

| Mechanism | Latency | Throughput |
|---|---|---|
| Inter-thread (lock-free queue) | ~10–100 ns | Hundreds of millions of msgs/sec |
| Inter-process via pipes | Several µs round-trip | ~1–4 GB/s |
| Inter-process via shared memory | Same as inter-thread (after setup) | Same as inter-thread |
| Unix domain sockets | A few µs round-trip | ~1–3 GB/s |

---

### Summary Decision Framework

| Concern | Processes | OS Threads | Green Threads |
|---|---|---|---|
| Fault isolation | Hard (MMU-enforced) | None | None |
| Memory sharing | Explicit (shm) | Automatic | Automatic |
| Context-switch cost | High (TLB, cache miss) | Medium | Very low |
| Creation cost | High | Medium | Very low |
| Max concurrency | Thousands | Thousands | Millions |
| Blocking syscall impact | None on others | None on others | Blocks carrier (without runtime mitigation) |
| IPC complexity | High | Low | Low |

**The root asymmetry**: isolation costs address-space switching, and address-space switching costs TLB coherence. Every other tradeoff between processes and threads flows from this single hardware constraint.