<!-- before / full-stack-developer / so-200469-process-vs-thread / run 2 -->

**Duration**: 103.5s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 103.45s > 60s

---
Here is the full breakdown from the agent:

---

## The Core Problem With "Process"

The word *process* is overloaded because it bundles together several distinct things: an address space, a set of resources, a unit of scheduling, and a security boundary. The OS and hardware are more precise.

---

## What Each Thing Actually Is

### Process — a resource container, not a runner

A process owns:
- A **virtual address space** (its private mapping from virtual to physical RAM, enforced by the MMU)
- A **file descriptor table** (open files, sockets, pipes)
- Signal disposition, credentials (UID/GID or Windows access token)
- Code segment, heap, data segment, memory-mapped files
- **At least one thread** — a process with zero threads cannot execute

Nothing *runs in* a process. Threads run *within* it. When you launch a Python script, the OS creates a resource container (process), loads the interpreter binary into its address space, then creates one thread inside that container and starts it at the entry point.

### Software Thread (OS/Kernel thread) — the unit of scheduling

A software thread is what the OS actually schedules onto a CPU core. It owns:
- A **program counter** (which instruction to execute next)
- A **register file** (all CPU registers: `rax`, `rsp`, `rip` on x86-64, etc.)
- A **stack** — its own private region *within* the process address space
- **Thread-local storage (TLS)** — where per-thread data like `errno` lives
- A **kernel stack** — used during syscalls/interrupt handling
- A **scheduling state** — runnable, blocked, sleeping

What it does *not* own: the heap, code segment, file descriptors, or the rest of the process address space. It **shares** all of those with every other thread in the process.

A context switch saves the outgoing thread's register file to memory and loads the incoming thread's saved registers. Cost: ~1,000–10,000 ns depending on TLB flush needs.

### Hardware Thread (Logical CPU / SMT / Hyper-Thread) — silicon, not software

A hardware thread is a **physical execution slot inside a CPU core**. Intel Hyper-Threading (Intel) and SMT (AMD) duplicate the **register file and instruction pointer** within a single core, while ALUs, FPUs, and load/store units remain **shared** between the two.

When one HW thread stalls on a cache miss (100+ cycles), the core's execution units immediately switch to the other HW thread — zero OS involvement, near-zero overhead. A 4-core / 2-way SMT CPU exposes 8 logical CPUs to the OS.

---

## Ownership at a Glance

| Resource | Process | Software Thread | Hardware Thread |
|---|---|---|---|
| Virtual address space | **Owns** | Shared | N/A |
| File descriptors / heap | **Owns** | Shared | N/A |
| Registers, PC, stack pointer | N/A | **Owns exclusively** | Each HW thread has its own |
| Stack memory | Allocates the region | **Owns by convention** | N/A |
| ALU / FPU execution units | N/A | Scheduled onto them | **Shared** between SMT siblings |
| L1/L2 cache | N/A | Shared with SMT sibling | Shared between SMT siblings |

---

## Why It Matters When Writing Code

**Threads vs processes for parallelism**
- Threads: fast to create, shared heap = low-latency communication, but a bug in one thread corrupts memory visible to all others. Races are non-deterministic and silent (no page fault).
- Processes: slower to create, require IPC (pipes, sockets, shared memory), but a crash in one process cannot corrupt another. This is why Chrome runs each tab in a separate process.

**CPU-bound work and hardware threads**
With 8 logical CPUs (4 cores, 2-way SMT), 8 CPU-bound threads give you ~15–30% more throughput than 4 threads — not 2×. The execution units are still shared. For CPU-bound work, match thread count to **physical cores**, not logical CPUs.

**The Python GIL**
CPython's Global Interpreter Lock ensures only one thread runs Python bytecode at a time. Multiple threads context-switch but cannot run Python in parallel across cores. For CPU-bound work use `multiprocessing` (separate processes, separate GILs). For I/O-bound work, `threading` works fine (threads release the GIL during syscalls), or use `asyncio`.

**Memory visibility and cache coherency**
Even on different physical cores, the CPU's cache coherency protocol (MESI/MOESI) ensures writes eventually propagate — but "eventually" is the trap. Without a memory barrier, the compiler and CPU can reorder loads/stores. An `acquire`/`release` atomic operation (C++ memory model, Java memory model, Rust's `Ordering`) inserts the necessary fence instructions to guarantee that a write on one thread is visible to another.

```
// Broken without proper ordering:
data = 42;       // thread A
ready = true;    // thread A

while (!ready) {} // thread B may see ready=true but stale data=0
use(data);
```

---

## The Compressed Mental Model

```
Hardware:
  Physical Core
  ├── Execution units (ALU, FPU, Load/Store) — shared by HW threads
  ├── HW Thread 0: own register file, own PC
  └── HW Thread 1: own register file, own PC  [SMT only]

OS / Kernel:
  Process (resource container)
  ├── Virtual address space (enforced by MMU + page tables)
  ├── File descriptor table
  ├── Heap, code, data segments
  └── Software Thread(s) (unit of scheduling)
      ├── Own: PC, registers, stack, TLS, kernel stack
      └── Share: everything else in the process

Scheduling:
  OS maps SW threads → HW threads
  One SW thread runs on one HW thread at a time
  Preemption saves/restores the register file (context switch)
```

The key insight: **the process never runs — threads run**. The process is the environment threads operate inside. When you ask "how many things run at once?" the answer is: as many hardware threads as the CPU provides, subject to the OS scheduler deciding which software threads to place on them.