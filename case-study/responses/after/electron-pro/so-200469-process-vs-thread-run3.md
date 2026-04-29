<!-- after / electron-pro / so-200469-process-vs-thread / run 3 -->

**Duration**: 71.0s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 70.96s > 60s

---
Here is the full breakdown:

---

## Process vs Thread: Concrete Distinctions

### What a Process Owns (exclusively)

A process is the OS's unit of **isolation**. The kernel gives each process its own:

- **Virtual address space** — the process sees a private mapping of memory; address `0x7fff1234` in process A points to different physical RAM than the same address in process B. The hardware MMU enforces this.
- **File descriptor / handle table** — fd 3 in process A is unrelated to fd 3 in process B.
- **Signal disposition and pending signal mask** (Unix).
- **Resource limits**, **credentials** (UID/GID on Unix, security token on Windows), **working directory**, **environment block**.

Cost of creating a process: the kernel must clone or set up a new page table hierarchy (copy-on-write on `fork`, or a fresh address space on `CreateProcess`). Typically tens of milliseconds and megabytes of overhead.

---

### What a Thread Owns (exclusively)

A thread is the OS's unit of **execution**. Inside a process, each thread owns:

- **A register file** — program counter, stack pointer, general-purpose registers. This is what gets saved/restored on a context switch.
- **Its own call stack** — a contiguous region carved out of the process's address space (typically 1–8 MB by default).
- **Thread-local storage (TLS)** — `__thread` / `thread_local` in C/C++, `threading.local()` in Python.
- **Signal mask** (Unix) — which signals are blocked for this thread.

Everything else — the heap, global variables, open file descriptors, code segments — is **shared** by all threads in the process. That sharing is both the point and the hazard.

---

### Hardware Threads vs Software Threads

These are different layers entirely.

**Hardware thread (logical CPU core)**
Modern CPUs use Simultaneous Multithreading (Intel: Hyperthreading). A single physical core has two complete sets of architectural registers and a program counter. Both share the same execution units (ALU, FPU, L1/L2 cache). If one stalls on a cache miss, the other can use the execution units. `nproc` / `os.cpu_count()` reports logical CPU count, not physical core count.

**OS (kernel) thread**
What `pthread_create`, `std::thread`, `Thread` in Java, etc. actually create. The kernel schedules these onto logical CPUs. Context switching between OS threads of the same process is cheap (no address space switch) but not free — registers must be saved, the scheduler runs, TLB may be partially flushed.

**Green thread / coroutine / goroutine**
A user-space construct. The language runtime (Go goroutine scheduler, Python asyncio, Java virtual threads in JDK 21+) multiplexes many of these onto a small pool of OS threads. Switching cost is extremely low — often just a function-call overhead, no kernel trap needed. The tradeoff: a blocking syscall in one green thread can stall the OS thread underneath it, blocking all green threads on that OS thread, unless the runtime intercepts syscalls (Go does; Python asyncio requires explicit `await`).

---

### Why It Matters When You Write Code

**1. Shared memory = data races by default.**
Any two threads can simultaneously read/write the same heap variable. No hardware protection. You must use mutexes, atomics, or lock-free structures. Processes cannot accidentally share memory — inter-process communication goes through an explicit API (pipes, sockets, shared memory), which is easier to audit.

**2. A crash in a thread kills the entire process.**
A segfault or uncaught exception in any thread delivers a signal to the whole process. For fault isolation (untrusted plugins, sandboxed computation), use a separate process. This is why browsers give each tab its own renderer process.

**3. Spawning cost.**
Thread creation: ~10–100 µs. Process creation (fork+exec): ~1–10 ms plus new address space overhead. For a web server handling thousands of connections, threading or async I/O wins; for a build system running compiler jobs, processes are natural.

**4. The GIL (Python-specific but illustrative).**
CPython's Global Interpreter Lock means only one OS thread runs Python bytecode at a time. CPU-bound work does not scale with threads in CPython — use `multiprocessing` for real parallelism. I/O-bound work scales fine because threads release the GIL while blocked on a syscall.

**5. Oversubscription.**
Spawning more OS threads than logical CPUs just adds context-switch overhead with no throughput gain for CPU-bound work. Rule: CPU-bound parallelism should use at most `logical_cpu_count` OS threads. I/O-bound work can use more because most threads are sleeping.

**6. Stack memory.**
Each thread's stack is a fixed reservation in the address space. 10,000 threads × 8 MB stacks = 80 GB of virtual address space — feasible on 64-bit, fatal on 32-bit. Green threads solve this with heap-allocated, growable stacks (Go starts goroutines at 8 KB and grows on demand).

---

### One-line summary of ownership

| Entity | Owns exclusively | Shares with siblings |
|---|---|---|
| Process | Address space, fd table, credentials | Nothing (by default) |
| OS thread | Register file, stack, TLS | Everything else in the process |
| Hardware thread | Register file | Execution units, cache |
| Green thread | Stack (heap-allocated), execution context | OS thread pool, heap |

The unit of **isolation** is the process. The unit of **execution** is the (OS or hardware) thread. Green threads are a scheduling optimization layered on top of OS threads.