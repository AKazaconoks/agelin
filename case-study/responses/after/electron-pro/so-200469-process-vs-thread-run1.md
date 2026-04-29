<!-- after / electron-pro / so-200469-process-vs-thread / run 1 -->

**Duration**: 48.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /process(es)?\s+(have\s+)?(their\s+own|separate|isolated)\s+(memory|address\s+space)/i | output did not match /(separate|distinct|isolated|own)\s+(memory|address\s+space)/i

---
Here is the full breakdown from the agent:

---

## Process vs Thread: What Each Actually Owns

### Process

A process is the OS unit of **isolation**. When the kernel launches a process it allocates:

- **Its own virtual address space** — the entire 4 GB (32-bit) or 128 TB (64-bit) range is private. No other process can read or write it without an explicit OS call (pipes, shared memory, sockets).
- **File descriptor / handle table** — open files, sockets, and pipes are tracked per-process.
- **Security context** — user ID, capabilities, integrity level on Windows.
- **At least one thread** — a process with zero threads is dead.

The kernel scheduler does **not** schedule processes. It schedules threads. A process is just a container of resources.

---

### Software Thread (kernel thread)

A thread is the actual unit of execution the OS scheduler sees. It owns only:

- **A stack** (typically 1–8 MB).
- **Register state** — instruction pointer, stack pointer, general-purpose registers, FP/SIMD state. This is what gets saved and restored on a context switch.
- **Thread-local storage (TLS)** — a small per-thread data segment, opt-in.

Everything else — heap, code segment, open handles, global variables — is **shared with every other thread in the same process**. That shared heap is precisely why you need mutexes.

---

### Hardware Thread (logical CPU)

This is a physical execution unit on the chip, not an OS concept. Two flavors:

- **Core** — a fully independent pipeline with its own ALU, FPU, L1/L2 caches. True parallelism.
- **Hyper-thread / SMT sibling** — two logical CPUs sharing one physical core's execution units. They share L1/L2 cache and execution ports. They look like two cores to the OS but compete for the same silicon. Under a memory-bound workload, two SMT siblings can be *slower* than one thread.

`lscpu` on Linux shows `Thread(s) per core`. If that is 2, your 8-core chip has 16 logical CPUs but only 8 physical ones.

---

### The ownership matrix

| Resource | Process A | Thread A1 | Thread A2 | Process B |
|---|---|---|---|---|
| Virtual address space | owns | shares with A2 | shares with A1 | separate |
| Heap allocations | owns | shares | shares | separate |
| Global variables | owns | shares | shares | separate |
| Stack | — | owns | owns | — |
| Registers / IP | — | owns | owns | — |
| Open file handles | owns | shares | shares | separate |
| PID / security token | owns | — | — | owns |

---

### Why it matters when writing code

**1. Crashes are contained by process boundary, not thread boundary.**
A null-pointer dereference in thread A2 kills the entire process including A1. This is why Chrome/Electron run each tab in a separate process.

**2. Context switch cost differs by orders of magnitude.**
- Thread switch: ~1–5 µs (register save/restore, possible partial TLB flush).
- Process switch: ~5–50 µs (full address space switch, TLB flush, cache eviction).
- IPC: add serialization cost on top.

**3. Shared memory is the source of most concurrency bugs.**
Threads share the heap, so every shared mutable object needs synchronization. Processes share nothing by default — IPC is explicit and serialized; you cannot accidentally race on a variable across a process boundary.

**4. Python's GIL is a thread-level lock.**
CPython holds one global interpreter lock per process. Two threads cannot execute Python bytecode in parallel. `multiprocessing` spawns separate processes with their own GIL, which is why CPU-bound Python scales with processes, not threads.

**5. Hardware threads set your parallelism ceiling.**
With 4 physical cores and SMT off, you get 4 truly parallel threads regardless of how many software threads you create. For CPU-bound work, more software threads than hardware threads adds context-switch overhead with no throughput gain.

---

### One-sentence summary of each

| Term | What it is |
|---|---|
| **Hardware thread** | A slot on the chip that can advance an instruction stream each clock cycle. |
| **Software/kernel thread** | The OS's record of what registers and stack belong to one flow of execution. |
| **Process** | An OS isolation boundary that owns an address space and groups threads under a single security context and resource table. |