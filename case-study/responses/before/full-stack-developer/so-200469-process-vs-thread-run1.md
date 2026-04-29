<!-- before / full-stack-developer / so-200469-process-vs-thread / run 1 -->

**Duration**: 160.6s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 160.63s > 60s

---
Here is a precise breakdown of every level, from silicon to user space:

---

## Processes vs. Threads vs. Hardware Threads

### What a Process Owns (Exclusively)

A process is the OS's unit of **resource ownership and isolation**. It exclusively holds:

- **Virtual address space** — enforced by the MMU via per-process page tables. On x86, the CR3 register points to the current process's page table root. Switching processes flushes the TLB.
- **File descriptor table** — `fd 3` in process A and `fd 3` in process B are completely independent.
- **Credentials** — uid, gid, capabilities
- **Signal handlers, resource limits, working directory**

`fork()` makes this concrete: the kernel duplicates the page table (copy-on-write), duplicates the fd table, and gives the child a new PID. From that point on, a write in the child triggers a CoW page fault — the parent never sees it. A crash in the child (SIGSEGV) does not affect the parent. Full hardware-enforced isolation.

---

### What a Thread Owns (Exclusively) vs. Shares

A thread lives inside a process. It owns exclusively:

- **Its own stack** — at a different address range, but *not* hardware-protected: any thread can write to another thread's stack if it has a pointer.
- **Register file** (PC, SP, general-purpose registers, FPU state) — saved/restored on context switch.
- **Thread ID, signal mask, `errno`** (thread-local storage)

Threads **share** everything else in the process:

- The entire virtual address space — any valid pointer is accessible from any thread. This is the root cause of data races.
- The file descriptor table — `close(3)` in one thread closes it for *all* threads.
- Memory mappings, heap allocator state, signal handlers.

`pthread_create()` calls `clone()` with `CLONE_VM` (share address space) + `CLONE_FILES` (share fd table). The new thread runs on its own stack, but `malloc()`, globals, and any pointer passed to it are immediately visible in both threads with no copy.

| Resource | Processes | Threads in Same Process |
|---|---|---|
| Virtual address space | Separate (MMU) | Shared |
| Stack | Separate | Separate (unprotected) |
| Heap | Separate (post-fork) | Shared |
| File descriptors | Separate tables | Shared table |
| Crash isolation | Full | None (one segfault kills all) |
| Communication cost | IPC (pipes, sockets, shm) | Direct pointer dereference |

---

### Hardware Threads (SMT / Hyperthreading) vs. Software Threads

These operate at completely different levels, which is why the shared term is confusing.

**Hardware threads (SMT):** A single physical core has one set of execution units (ALUs, FPUs, load/store). SMT adds a *second complete register file and instruction pointer* to the same physical core, interleaving two instruction streams to use execution slots that would otherwise stall. Each hardware thread looks like a full CPU to the OS.

What they *share*: execution units, L1 cache, L2 cache, TLB, branch predictor. This is why:
- Two OS threads on sibling hardware threads get ~20–30% more throughput per core, not 100%.
- They compete for cache. A cache-heavy workload on one evicts the other's data.
- Spectre-class vulnerabilities exploit the shared branch predictor between siblings.

**Software threads** come in three distinct layers:

| Level | Scheduled by | Preemptive | Stack cost |
|---|---|---|---|
| OS/kernel thread (`pthread`) | Kernel | Yes | ~8KB kernel stack + `task_struct` |
| Green thread / goroutine | Runtime (Go GMP, JVM virtual threads) | Sometimes | 2–4KB, dynamic |
| Fiber / coroutine (`async/await`) | Application code | No — cooperative | Minimal (just registers + stack frame) |

Go goroutines start at 2–4KB stacks that grow dynamically. When a goroutine blocks on a syscall, the Go runtime detaches the OS thread from its logical processor (`P`) and parks the goroutine, so other goroutines keep running. For network I/O, Go uses non-blocking sockets + epoll under the hood — the goroutine suspends at the *runtime* level, not the OS level.

Fibers/coroutines are cooperative — one that never yields starves all others on that OS thread. They cannot make blocking syscalls. This is why async frameworks (`tokio`, `asyncio`, `libuv`) wrap all I/O as non-blocking and dispatch through an event loop.

---

### Why This Matters When Writing Concurrent Code

**1. Memory visibility and data races**

Threads share an address space with no hardware barrier between them. A write in thread A is immediately visible to thread B — subject to the hardware memory model. x86 uses TSO (stores not reordered with stores), so naïve lock-free code often "works." ARM is much weaker and will reorder freely. Code that relies on accidental x86 ordering breaks on ARM without explicit acquire/release fences.

**2. Crash domains**

A segfault in any thread sends SIGSEGV to the *process*. The default handler kills everything. There is no way to catch a segfault in one thread and continue the others. This is why Chrome uses a process per tab, and why Nginx uses master + worker processes. Go's `recover()` can catch panics in goroutines (since the runtime manages them), but not true illegal memory accesses via `unsafe`.

**3. Mutex scope**

A `pthread_mutex_t` lives in process memory and only coordinates threads within that process. After `fork()`, each process has its own copy of the mutex — they do not coordinate. Cross-process mutexes require `PTHREAD_PROCESS_SHARED` + shared memory.

**4. False sharing and hardware thread topology**

Atomic operations (`LOCK XADD` on x86) are cache-coherency broadcasts. Cost depends on where the data lives:

- Same physical core (sibling hardware threads) → stays in L1, cheap.
- Different physical cores → traverses the cache interconnect, expensive.
- Different sockets (NUMA) → 3–10x slower than local.

False sharing hits when thread A writes `array[0]` and thread B writes `array[1]` and both fit in the same 64-byte cache line. The hardware invalidates the entire cache line on every write from either side. Fix: pad or `alignas(64)` to put each thread's hot data in its own cache line.

**5. Blocking and I/O model**

- **OS threads blocking on I/O:** kernel sleeps the thread, schedules others. Zero wasted CPU.
- **Green threads blocking on I/O naively:** blocks the entire OS thread, starving all goroutines on it. Go avoids this by using non-blocking I/O internally.
- **Fibers/coroutines:** must never block. An `await` suspends at the runtime level and hands control back to the event loop.

---

### The Layered Mental Model

```
Hardware threads (SMT)
  └─ Two register files sharing one physical core's execution units
  └─ Scheduled by hardware; the OS sees them as separate logical CPUs

OS threads (kernel threads)
  └─ Scheduled by kernel; each runs on one logical CPU at a time
  └─ 1:1 with software thread (pthreads) OR many:1 in M:N runtimes (Go)

Process
  └─ Owns: address space, fd table, credentials
  └─ Contains 1..N OS threads
  └─ Hard crash/memory isolation boundary

Green threads / goroutines / async tasks
  └─ Multiplexed onto OS threads by a runtime
  └─ Much cheaper than OS threads
  └─ Isolation only what the runtime provides — no hardware enforcement
```

**Practical rules:**
- **Processes** → crash isolation, security boundaries, independent resource ownership. Pay IPC costs.
- **OS threads** → true CPU parallelism with shared mutable state. You manage all synchronization.
- **Goroutines / async tasks** → high-concurrency I/O-bound work (thousands+ concurrent operations). The runtime handles multiplexing.
- **Fibers / coroutines** → fine-grained cooperative scheduling within one OS thread. No blocking syscalls allowed.
- **Hardware threads** → factor into cache tuning, NUMA-aware allocation, and atomic operation costs. Not something you schedule directly, but they determine the physical cost of everything above.