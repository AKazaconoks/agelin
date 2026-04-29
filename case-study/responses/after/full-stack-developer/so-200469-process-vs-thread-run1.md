<!-- after / full-stack-developer / so-200469-process-vs-thread / run 1 -->

**Duration**: 112.7s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 112.69s > 60s

---
Here is a thorough breakdown of the distinction:

---

## Processes vs Threads: What Each Owns, What They Share, and Why It Matters

---

### 1. The Process — The Unit of Isolation

A **process** is the OS's fundamental isolation container. It owns a private, hardware-enforced set of resources:

**Owned exclusively:**
- **Virtual address space** — the OS (via the MMU/page tables) gives each process its own private memory map. A pointer from process A is meaningless or illegal in process B. This is enforced by hardware.
- **Page tables** — the mapping from virtual to physical memory. Switching processes requires loading new page tables and flushing the TLB — this is why process context switches are expensive.
- **File descriptor table** — open files, sockets, pipes are tracked per-process.
- **Security identity** — UID/GID/capabilities on Unix.
- **Working directory, environment, resource limits.**
- **At least one thread** — a process with no thread cannot execute.

**Key implication:** A wild pointer, buffer overflow, or `free()`-then-use in one process cannot corrupt another's memory. The hardware enforces this. This is why browsers run tabs in separate processes.

---

### 2. The Thread (Software/Kernel Thread) — The Unit of Execution

A **thread** lives *inside* a process. Multiple threads share almost everything the process owns, but each maintains its own execution state:

**Owned exclusively per thread:**
- **Program counter** — where in the code this thread is executing.
- **Register file** — all CPU registers (general-purpose, FPU, SIMD, flags). Saved/restored on context switch.
- **Stack** — its own call stack (~1–8 MB by default). Local variables, return addresses, saved registers live here.
- **Thread-local storage (TLS)** — `thread_local` variables in C++, `[ThreadStatic]` in .NET, etc. get one copy per thread.
- **`errno`** on POSIX (thread-local in any correct libc).

**Shared across all threads in a process:**
- Entire heap, global/static variables, code segments.
- All file descriptors — if one thread closes a socket, it's closed for all threads.
- Signal handlers (though each thread has its own signal mask).

**Key implication:** Shared memory is both threads' power (zero-copy communication) and their danger (data races, corruption with no hardware protection between them). A bug in one thread can corrupt data another thread is reading, silently and non-deterministically.

---

### 3. Hardware Threads — Physical vs Logical CPUs

This is a separate concept:

**Physical cores** — completely independent execution units (registers, pipelines, L1/L2 cache). True parallelism. Two physical cores run two instruction streams simultaneously.

**Hyper-Threading / SMT** — Intel/AMD expose 2 logical CPUs per physical core. Each logical CPU has its own registers and program counter, but they **share the execution units, L1/L2 cache, and memory bus**. The idea: when one logical thread stalls waiting on a cache miss (~100–300 cycles), the other logical thread uses those idle execution units. Benefit is ~15–30% on memory-bound workloads; near-zero or slightly negative on compute-bound workloads with hot caches.

**The mapping:** The OS scheduler maps software threads → hardware (logical) CPUs. At any instant, each logical CPU runs one software thread, preempted every ~1–10 ms.

- Thread context switch (same process): cheap — no page table reload, cache is warm.
- Process context switch: expensive — new page tables loaded (CR3 register on x86), TLB flushed, cache working set goes cold.

---

### 4. Green Threads / Goroutines / Coroutines — User-Space Threads

A third layer: user-space threads scheduled by a runtime, not the OS kernel.

- Go goroutines, Erlang processes, Java Virtual Threads, Python `asyncio` coroutines.
- Millions can exist: a goroutine starts at ~2–8 KB (OS threads reserve 1–8 MB).
- A small pool of OS threads (typically = logical CPU count) multiplexes many user-space threads (Go's M:N model).
- Context switches don't cross the kernel boundary → much cheaper.
- **Trade-off:** A blocking syscall blocks the OS thread underneath, stalling all user-space threads on it. Runtimes handle this by intercepting syscalls (Go) or requiring async I/O (`asyncio`).

---

### 5. Ownership Summary

| Resource | Process | Thread 1 | Thread 2 | Other Process |
|---|---|---|---|---|
| Virtual address space | Owns | Shares | Shares | Separate |
| Heap / globals | Owns | Shares | Shares | Separate |
| File descriptors | Owns | Shares | Shares | Separate |
| Page tables / TLB | Owns | — | — | Separate |
| Stack | — | Own | Own | — |
| Registers / PC | — | Own | Own | — |
| TLS variables | — | Own | Own | — |

---

### 6. Why It Matters When Writing Code

**Correctness:**
- Any mutable heap or global state is a data race when accessed from multiple threads without synchronization. The C++/Java memory models define precise visibility rules — violating them gives undefined behavior that only appears under load or on specific hardware.
- File descriptors are shared. Closing a socket in one thread while another is `read()`-ing it is a race.

**Performance:**
- Processes pay higher IPC costs (pipes, sockets, shared memory segments — all require syscalls and often copying).
- Threads communicate via shared memory at near-zero cost, but lock contention at high thread counts becomes a bottleneck.
- **False sharing:** Two threads writing different variables that happen to share a 64-byte cache line causes the hardware cache coherence protocol (MESI) to bounce that line between cores — a massive slowdown even though the threads touch logically separate data.
- SMT means "logical CPU count ≠ true parallelism." A thread pool sized to 2× logical CPUs for CPU-bound work mostly just puts pairs fighting for the same physical core.

**Fault tolerance:**
- A crashed thread (segfault, stack overflow) typically kills the entire process — no intra-process memory protection.
- A crashed process is contained by the OS. This is why Apache prefork, Gunicorn, and similar servers use process-per-request, accepting the IPC overhead for crash isolation.

**Security:**
- Process isolation is hardware-enforced. Thread "isolation" is a software convention — any thread can read or write any other thread's heap if it has a pointer. Parsers handling untrusted input belong in separate processes if you want containment.

---

### Mental Model

Think of a **process as a sealed building** — it owns the land, rooms, plumbing. **Threads are people working inside** — they share the hallways (address space) and whiteboard (heap), but each carries their own notepad (stack) and knows where they personally left off reading (program counter). **Hardware threads are the desks** — only as many people can work simultaneously as there are desks, regardless of how many people are in the building. **Green threads / coroutines** are people taking turns at a single desk cooperatively, without a manager (the kernel) ever needing to intervene.