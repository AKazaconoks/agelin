<!-- after / full-stack-developer / so-200469-process-vs-thread / run 2 -->

**Duration**: 182.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: token budget exceeded: 3440 > 3000

---
Here is the full technical breakdown from the agent:

---

## 1. What Is a Process?

A process is the OS's unit of **resource ownership and isolation**. When the kernel creates a process, it allocates a distinct set of resources that no other process can touch without explicit mechanisms (pipes, shared memory, sockets, etc.).

**Resources a process owns:**

| Resource | Detail |
|---|---|
| Virtual address space | A private mapping of virtual → physical pages via the page table. On x86-64, typically 128 TiB for user space. |
| Page table | The hardware data structure (pointed to by `CR3` on x86) that defines that mapping. Each process has its own. |
| File descriptor table | The kernel's per-process array of open file descriptions. |
| Signal handlers and signal mask | `sigaction` state. |
| UID/GID / capabilities | The security context. |
| Working directory, `umask` | Inherited from parent at `fork()`, independent thereafter. |
| Memory-mapped regions | `mmap()` mappings: code, heap, stack, shared libraries loaded at their own addresses. |
| PID, parent PID | Kernel bookkeeping. |
| Resource limits (`RLIMIT_*`) | CPU time, open files, address space size, etc. |

### What `fork()` actually does

```c
pid_t pid = fork();
```

The kernel:
1. Allocates a new `task_struct` (Linux's process descriptor).
2. **Copies** the parent's page table, but marks every writable page in both parent and child as **copy-on-write (CoW)**. Physical memory is *not* duplicated yet.
3. Copies the file descriptor table (both processes now share the same underlying `file` objects).
4. The child gets its own PID, signal state copy, and `brk` pointer.

When the child writes to an address, a page fault fires, the kernel allocates a new physical page, copies the content, and remaps only that page in the child's page table. The parent's page is untouched. That is CoW.

---

## 2. What Is a Software (OS) Thread?

A thread is the OS's unit of **execution and scheduling**. It shares its process's address space and most resources, while owning only what is necessary to independently execute instructions.

### What a thread owns exclusively

| Resource | Why it needs it |
|---|---|
| **Stack** | Its own call stack (~1–8 MiB), `mmap`'d in the process's virtual address space. Local variables, return addresses, saved registers live here. |
| **Program counter (RIP/PC)** | Where this thread is currently executing. |
| **Register file** | All GPRs (`rax`, `rbx`, ...), `rsp`, `rbp`, FP/SIMD state. Saved to the thread's kernel stack on context switch. |
| **Thread-local storage (TLS)** | Addressed via `%fs` on x86-64. Each thread gets its own `errno`, `thread_local` variables. |
| **Signal mask** | `pthread_sigmask` is per-thread. |
| **Kernel stack** | ~8–16 KiB in kernel space for syscalls and interrupts. |
| **Thread ID (TID)** | On Linux, threads *are* tasks. `gettid()` returns kernel TID; `getpid()` returns the TGID (same for all threads in a process). |

### What a thread shares with its process

- The **virtual address space** — all threads see the same heap, globals, and code segments. `malloc()` on thread A returns an address thread B can immediately dereference.
- **File descriptors** — an fd opened in one thread is visible in all.
- Signal handlers, memory-mapped files, shared libraries.

### What the stack actually looks like in memory

```
High address
+----------------------+  <- main thread stack top
|   main thread stack  |  (grows down)
+----------------------+
|   (guard page)       |  <- PROT_NONE; triggers SIGSEGV on overflow
+----------------------+
|   thread 2 stack     |  (mmap'd anonymously, below main stack)
+----------------------+
|   (guard page)       |
+----------------------+
|     shared heap      |  (one heap; all threads malloc from it via locks)
|     shared .data     |
|     shared .text     |
+----------------------+
Low address
```

Both stacks live in the **same virtual address space**. There is no hardware enforcement between them — thread A can read thread B's stack if it has a pointer to it.

### Threads in Linux: `clone()`

Both `fork()` and `pthread_create()` go through `clone(2)`. The difference is which flags are passed:

```c
// fork() is roughly:
clone(SIGCHLD, ...);  // child gets copies of everything

// pthread_create() is roughly:
clone(CLONE_VM | CLONE_FILES | CLONE_THREAD | ..., ...);
// CLONE_VM: share address space (no page table copy)
// CLONE_FILES: share fd table
// CLONE_THREAD: same TGID
```

The kernel's `task_struct` is the same structure for both — "process" vs "thread" is just which `clone` flags were set.

---

## 3. Hardware Threads: SMT / Hyper-Threading

### A core without SMT

A physical core has one set of execution units (ALUs, FPUs, load/store), one register file, and one program counter. Without SMT, when a cache miss stalls the pipeline (~100–200 cycles), those execution units sit idle.

### SMT (Hyper-Threading on Intel)

SMT exposes **two hardware threads per physical core**, each with its own:
- Architectural register file
- Retirement unit / reorder buffer state
- Local APIC (so the OS sees it as a separate "CPU")

They **share**:
- All execution units (ALUs, FPUs, branch predictor)
- L1/L2 caches and TLBs

The core's out-of-order engine interleaves instructions from both hardware threads. When thread 0 stalls on a cache miss, thread 1's instructions can make progress. That is the whole point: hide memory latency by keeping execution units busier.

### What the OS sees

On a 4-core Intel chip with HT, the OS sees 8 logical CPUs. `lscpu`:

```
Core(s) per socket:  4
Thread(s) per core:  2
CPU(s):              8
```

### SMT is not 2x

Because execution units are shared, two CPU-bound threads on the same physical core compete. Typical gain: **15–30%**, not 100%. For latency-critical workloads (HPC, real-time), it is common to disable HT and pin one software thread per physical core. The shared microarchitectural state is also what Spectre/Meltdown exploited — sibling hardware threads can observe each other's cache timing.

---

## 4. The OS Scheduler

The Linux CFS scheduler operates on **tasks** — the kernel's term for both processes and threads indiscriminately. On a timer interrupt (~1–4 ms):

1. Hardware saves registers to the kernel stack.
2. Scheduler picks the next task from the CPU's runqueue.
3. `context_switch()` runs:
   - Saves current task's registers into its `task_struct`.
   - Loads the next task's saved registers.
   - If switching to a **different process**: reloads `CR3` (page table base), flushing the TLB.
   - Jumps to the restored `rip`.

**Thread context switch (same process):** ~1–10 µs. Register swap only, no `CR3` reload, TLB stays warm.

**Process context switch (different process):** ~10–100 µs. `CR3` reload, TLB flush, cold caches.

This is a **concrete, measurable** difference, not a theoretical one.

---

## 5. Why This Matters When You Write Code

### Memory isolation (process) vs shared state (thread)

A segfault in one process cannot corrupt another's address space — page tables enforce this in hardware.

A heap corruption bug in one thread corrupts the **shared heap** of all threads in the process. Thread A overwrites Thread B's allocator metadata. Thread B crashes later, far from the actual fault. This is why multithreaded bugs are so hard to reproduce and diagnose.

In an Apache prefork model, a misbehaving request handler damages only its own process. In a thread-per-request model, a single heap corruption can take down the entire server.

### Data races and shared state

Two threads doing `counter++` on a shared `int` compile to load → increment → store. Without synchronization, both threads can load `0`, both increment to `1`, both store `1` — two increments, net result `1`. This is a **data race** — undefined behavior in C/C++, defined race conditions in Go/Java/Rust per their memory models.

There is no equivalent bug with processes — IPC requires explicit syscalls, which are synchronization points by nature.

### Context switch cost and the async model

A thread calling `read()` on a socket with no data blocks — it is descheduled, kernel parks it in a wait queue. Other threads continue. This is why 10,000 threads means ~10 GiB of stacks, heavy scheduler churn, and cache thrashing. The async/event-loop model (`epoll`/`io_uring` in Node.js, Python asyncio, Tokio) uses one or a few threads and multiplexes I/O readiness — the OS notifies when an fd is ready rather than blocking.

### The Python GIL

CPython's GIL means only one thread executes Python bytecode at a time, regardless of CPU count:
- **I/O-bound:** threads still help — the GIL is released before blocking syscalls, so other threads run bytecode while one waits.
- **CPU-bound:** multiple Python threads are *slower* than one, due to GIL contention and cache-line bouncing on the lock itself.
- Fix: `multiprocessing` (separate processes, separate GIL) or native extensions that release the GIL.

### `fork()` safety and threads

When you `fork()` in a multithreaded process, the child gets **one thread** (the caller) but inherits all mutexes. If another thread held the `malloc` heap lock at the moment of `fork()`, that lock is permanently locked in the child — the next `malloc()` deadlocks. POSIX's `pthread_atfork()` exists to handle this, but it is fragile. The safe rule: **fork before creating threads**, or call only async-signal-safe functions after forking.

### False sharing

Two threads on different cores updating *different* variables that share a **cache line** (64 bytes on x86) cause the MESI cache coherency protocol to bounce that line between cores:

```c
struct {
    int counter_a;  // used by thread A
    int counter_b;  // used by thread B — same 64-byte cache line!
} shared;
```

Neither thread is sharing logical state, but every write invalidates the other's L1 entry. Fix: `alignas(64)` to pad each to its own cache line.

---

### Summary: choosing your concurrency primitive

| | Process (`fork`) | OS Thread (`pthread`) | Async task (coroutine) |
|---|---|---|---|
| Address space | Isolated | Shared | Shared (same thread) |
| Context switch cost | High (TLB flush) | Low | Near-zero (user-space) |
| Crash isolation | Yes | No | No |
| Communication | IPC (pipes/sockets/shm) | Shared memory + locks | Shared memory, cooperative |
| Parallelism | Yes | Yes (if no GIL) | No (single-threaded) |
| Stack per unit | One | 1–8 MiB each | ~4 KiB (heap-allocated) |
| Typical use | CPU-bound Python, isolation-critical servers | CPU-bound C/C++/Java/Rust | I/O-bound at scale (10k+ connections) |

**The core insight:** threads are cheap to communicate between and expensive to get right; processes are expensive to communicate between and cheap to reason about. Hardware threads are a microarchitectural detail the OS mostly hides from you — except when squeezing the last 20% of throughput and you need to think about physical core topology, cache sharing, and execution unit contention.