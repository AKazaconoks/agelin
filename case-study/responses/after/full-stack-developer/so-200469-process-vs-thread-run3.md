<!-- after / full-stack-developer / so-200469-process-vs-thread / run 3 -->

**Duration**: 215.4s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 215.37s > 60s

---
Here is the full technical breakdown:

---

## 1. What a Process Owns

A process is the OS's unit of **resource ownership** and **isolation**. Its most important property is a private **virtual address space**, enforced by the CPU's MMU via per-process page tables. Two processes can hold a pointer to the same virtual address and have it resolve to completely different physical RAM pages.

Within that address space, the layout (simplified, Linux x86-64) is:

```
High addresses
  Kernel space
  Stack (grows down; one per thread, main thread's is here)
  Memory-mapped region (shared libs, mmap'd files)
  Heap (grows up; malloc/free live here)
  BSS segment   (zero-init globals: int g; lives here)
  Data segment  (initialized globals: int g = 5; lives here)
  Text segment  (read-only machine code)
Low addresses   (0x0 unmapped to catch null-derefs)
```

The process also owns, exclusively:

| Resource | Notes |
|---|---|
| Virtual address space | Enforced by MMU/page tables |
| File descriptor table | Open files, sockets, pipes — copied on `fork()` |
| PID / PPID / PGID / SID | Unique kernel IDs; used for job control, signals |
| Signal disposition table | Per-process; signal handlers registered here |
| Credentials (UID/GID) | Affects all syscalls; `setuid()` changes the whole process |
| Resource limits (rlimits) | Max open files, max stack size, etc. |
| Memory maps (VMAs) | Which virtual pages map to what backing store |
| Working directory, umask | Inherited on fork, independent after |

A crash (segfault) in process A is caught by the kernel, terminates A, and leaves B, C, D completely untouched — their page tables are separate.

---

## 2. What a Thread Owns vs What It Shares

A thread is the OS's unit of **execution** inside a process. All threads in a process share the process's resources, but each has its own execution context.

### Thread-private state

| Resource | Why it's private |
|---|---|
| **Stack** | Each thread gets its own stack region (default 8 MB on Linux). Local variables and stack frames live here. `int i = 0` in thread 1 and `int i = 0` in thread 2 are at different virtual addresses — completely independent. |
| **Registers + PC** | The CPU register file (RIP, RSP, RAX, …) is saved/restored per thread on every context switch. |
| **Thread ID (TID)** | On Linux, every thread has a TID (`gettid()`). The main thread's TID == PID. |
| **Thread-Local Storage (TLS)** | Variables declared `thread_local` get one instance per thread. This is how `errno` works — it's `__thread`-qualified so two threads making syscalls don't stomp each other's error codes. Implemented via the FS segment register pointing to a per-thread data block. |
| **Signal mask** | `pthread_sigmask()` sets which signals this thread blocks — independent of other threads. |

### Shared (process-wide) state

| Resource | Implication |
|---|---|
| **Heap** | `malloc()` returns a pointer valid in all threads. This is the root cause of most data races. |
| **Global/static variables** | `int g_counter = 0` at file scope is one memory location shared by every thread. `static` locals inside functions are also shared — this is why `strtok()` is not thread-safe. |
| **File descriptors** | Thread 1 writing to fd 3 and thread 2 reading from fd 3 are on the same socket. |
| **Code (text segment)** | All threads execute the same compiled instructions; each has its own register state while doing so. |
| **Signal handlers** | `sigaction()` writes to the process-wide disposition table, affecting all threads. |

---

## 3. Hardware Threads vs Software Threads

This is the most commonly conflated distinction.

### Physical cores

A physical core is a complete execution unit: its own ALU, FPU, L1/L2 caches, register file, and decode pipeline. A 4-core machine can execute 4 instruction streams truly in parallel.

### Hardware threads (SMT / Hyper-Threading)

Intel's Hyper-Threading (a form of SMT) makes one physical core appear as **two logical processors** to the OS. What it actually duplicates is narrow:

- **Duplicated:** The architectural register file (two complete sets of RIP, RSP, GPRs, etc.) and some front-end control logic.
- **Shared:** Execution units (ALU, FPU, load/store), L1/L2 caches, decode pipeline.

The motivation: a single instruction stream stalls for 100–300 cycles on a cache miss. During that stall, the execution units are idle. With SMT, the core can run instructions from the second hardware thread during those stalls, gaining ~15–30% throughput on mixed workloads.

**Key implication:** Two software threads scheduled on the two hardware threads of the *same* physical core are **not fully parallel** — they compete for the same execution units and L1/L2 cache bandwidth. Two threads on *different* physical cores are fully parallel (they share only the L3 cache).

### The three levels

| Level | Manager | Count (typical desktop) |
|---|---|---|
| Physical core | Hardware | 8–24 |
| Hardware thread (logical CPU) | CPU SMT | 16–48 (2× with HT) |
| OS/software thread (`task_struct`) | OS scheduler | Thousands |
| User-space thread (goroutine, virtual thread) | Language runtime | Millions |

The OS scheduler is topology-aware on modern kernels: Linux reads CPU topology via CPUID/ACPI and prefers scheduling parallel threads onto separate physical cores before filling both hardware threads of the same core.

---

## 4. Why This Matters When Writing Code

### Crash boundaries

A segfault in any thread kills all threads — they share the address space. If fault isolation matters (e.g., one buggy request handler should not kill the server), use **separate processes**. This is why Chrome spawned a process per tab: a renderer crash does not take down the browser.

### Synchronization is mandatory for shared state

`counter++` compiles to three instructions: load, increment, store. Without synchronization, two threads can both load the same value, increment independently, and both store the same result — losing an increment. In C/C++, a data race is **undefined behavior**.

Threads require explicit synchronization (mutexes, atomics, condition variables). Processes avoid this by default — sharing memory between processes requires explicit opt-in via `mmap(MAP_SHARED)` or POSIX shared memory.

### Context switch cost

Switching between threads in the *same* process is cheaper than switching between processes. The reason: the virtual address space doesn't change, so the TLB (the CPU's cache of virtual→physical address translations) doesn't need to be flushed. A process switch requires switching page tables (CR3 on x86), which either flushes the TLB or requires PCID-tagged TLB entries.

Rough ballpark:
- Goroutine switch (user-space): ~100–300 ns
- Thread context switch (same process): ~1–5 µs
- Process context switch: ~5–20 µs (plus TLB warm-up)

### False sharing and cache effects

A CPU cache line is 64 bytes. If two threads on different cores write to different variables that share a cache line, the hardware coherence protocol (MESI) forces the cores to repeatedly invalidate each other's cache lines — even though the writes are logically independent. Fix: align hot per-thread data to cache line boundaries (`alignas(64)`).

For CPU-bound parallel work, spawn threads equal to the number of **physical cores**, not logical processors. SMT helps most for mixed workloads (compute + memory stalls); for pure compute, both hardware threads of a core compete for the same execution units.

---

## 5. Where "Process" Gets Overused

**"Background process"** — colloquially means any running program (technically correct: it is an OS process, just without a terminal).

**Unix philosophy** — the original Unix concurrency model was process-based: `fork()` + `pipe()`. Tools like `cat | grep | sort | uniq` are a multi-process pipeline with IPC. POSIX threads came later (1995) as a cheaper but less isolated alternative.

**Linux `clone()` reveals the truth** — `fork()` and `pthread_create()` both call `clone()` with different flags (`CLONE_VM`, `CLONE_FILES`, `CLONE_SIGHAND`, etc.). The kernel-level distinction between process and thread is a **spectrum of resource sharing**, not a binary.

**Python's GIL** — CPython has a Global Interpreter Lock: only one thread can execute Python bytecodes at a time. Threads give you I/O concurrency but not CPU parallelism. `multiprocessing.Process` spawns separate OS processes, each with their own interpreter and GIL — true parallelism at the cost of no shared memory (data must be pickled across `Queue`/`Pipe`). This is the process isolation property making itself felt in everyday Python code.

**Containers** — a Docker container is not a process. It is a group of processes sharing the host kernel but isolated via Linux namespaces (PID, network, mount, UTS). From the host, container processes have regular PIDs. No separate kernel, no hypervisor — fundamentally different from a VM.

---

**Bottom line:** A process is a protected, isolated resource container. A thread is a cheap execution context that shares the process's container with all sibling threads. Hardware threads are partial CPU duplications that allow SMT but still share execution resources. When you write concurrent code, the process/thread distinction determines whether crashes are isolated, whether you need locks, how expensive communication is, and how many truly parallel executions you can achieve on a given machine.