<!-- before / electron-pro / so-200469-process-vs-thread / run 2 -->

**Duration**: 99.1s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 99.06s > 60s

---
Here is the full technical breakdown from the agent:

---

## Processes, Threads, and Hardware Threads: A Concrete Mental Model

The vocabulary fights you here because "thread" and "process" operate at three distinct abstraction levels that rarely get separated cleanly.

---

### Level 1: The OS Process — Unit of Resource Ownership

When the kernel creates a process, it allocates a private virtual address space. Nothing else can touch it without kernel-mediated mechanisms (shared memory, pipes, sockets, etc.).

**A process exclusively owns:**
- **Virtual address space** — its own page table hierarchy (`mm_struct` on Linux, `EPROCESS` on Windows). A pointer `0x7fff_0000_1234` in process A and process B point to physically different RAM pages.
- **File descriptor table** — closing fd 5 in one process doesn't affect another.
- **Signal handlers, credentials, resource limits, working directory.**

**Context switch cost is high** because the CPU must write a new value to CR3 (the page table root register on x86-64), which **flushes the TLB** — forcing the CPU to re-walk page tables for subsequent memory accesses. Post-Spectre, branch predictor state may also be flushed.

**The payoff:** a crash (segfault, stack overflow) in one process cannot corrupt another's memory. This is why browsers run each tab in a separate process.

---

### Level 2: The OS (Software) Thread — Unit of Execution Within a Process

Linux `pthread_create` calls `clone()` with flags like `CLONE_VM | CLONE_FILES` — you get a new schedulable entity that shares almost everything with its creator.

**A thread exclusively owns:**
- **Its stack** — a region of the shared address space (1–8 MB by default). Local variables and call frames live here. Technically addressable by all threads, but no other thread should touch it.
- **Register file (when off-CPU)** — saved into a kernel-side context block (`task_struct` on Linux). RIP, RSP, general-purpose registers, SIMD state via XSAVE.
- **Thread-local storage (TLS)** — accessed via the `fs`/`gs` segment base on x86-64. `thread_local` in C++/Rust and `threading.local()` in Python all go through this. `errno` is also TLS.

**Threads share (within the same process):**
- The entire heap and all global/static memory.
- All open file descriptors.
- The page table itself — **no CR3 change** on a same-process thread switch, so no TLB flush. This is the primary performance advantage of threads over processes.

**The footgun:** shared memory is both the feature and the danger. `counter++` compiles to a read-modify-write sequence that is *not atomic* without `LOCK XADD`. The compiler and CPU can also reorder instructions — you need `std::atomic`, memory fences, or a mutex to enforce ordering.

---

### Level 3: The Hardware Thread (Hyper-Thread / SMT)

Intel's Hyper-Threading and AMD's SMT replicate the **register file and instruction fetch/decode front-end** inside one physical core. One core, two (or more) logical CPUs.

**Each hardware thread exclusively owns:**
- The full architectural register file (16 GPRs, RIP, RFLAGS, AVX registers, etc.).
- Its own out-of-order retirement state.

**Hardware threads share within a physical core:**
- **Execution units** (ALUs, FPUs, load/store ports) — two hyper-threads contend for the same ports.
- **L1 and L2 caches** — this is where **false sharing** bites: if thread A writes to bytes 0–31 of a cache line and thread B writes to bytes 32–63, the MESI coherence protocol still ping-pongs the whole 64-byte line, even though they're writing logically independent data.
- The memory bus and L3 cache (shared across all cores).

The OS sees each logical CPU as an independent scheduler target. On a 8-core SMT-2 machine, the OS sees 16 logical CPUs and can run two OS threads on them *truly simultaneously*. But because execution units are shared, CPU-bound SMT workloads gain roughly 15–30%, not 2×.

---

### Summary Table

| Concept | Unit of | Exclusively Owns | Shares With |
|---|---|---|---|
| OS Process | Resource ownership | Virtual address space, fd table, page tables | Nothing (by default) |
| OS Thread | Execution | Stack, register save area, TLS, errno | Heap, globals, fd table, code, address space |
| Hardware Thread | Instruction stream | Register file, retirement state | Execution units, L1/L2 cache, TLB |

---

### Practical Implications for Code

1. **False sharing is a hardware thread concern.** Pad structs so independently-mutated fields land on separate 64-byte cache lines (`alignas(64)` in C++, `#[repr(align(64))]` in Rust).

2. **Spawn cost:** `fork()` is expensive (page table copy + CoW setup); `pthread_create` is cheap (no address space switch). Use processes for crash/security isolation; threads for throughput.

3. **Preemption happens between any two instructions.** The OS timer fires every ~1–4ms on Linux (~15.6ms on Windows default). Any unsynchronized access to shared state is a race condition, no matter how "obvious" the source looks.

4. **Python's GIL is an OS thread concern, not a hardware thread concern.** You can have 16 OS threads on 16 logical CPUs — the GIL still serializes Python bytecode execution. That's why CPU-bound Python uses `multiprocessing` (separate address spaces, no shared GIL).

5. **`async`/`await` is neither.** Coroutines (asyncio, Tokio, goroutines) are user-space cooperative scheduling: one OS thread multiplexes many tasks by yielding at I/O boundaries. Zero kernel involvement per context switch, no TLB flush. Great for I/O-bound work; doesn't help CPU-bound work (offload that to a thread pool: `spawn_blocking`, `run_in_executor`).