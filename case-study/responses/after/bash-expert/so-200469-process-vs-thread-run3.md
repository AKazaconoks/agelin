<!-- after / bash-expert / so-200469-process-vs-thread / run 3 -->

**Duration**: 61.4s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 61.38s > 60s

---
Here is a structured breakdown of the distinction:

---

## Processes vs. Software Threads vs. Hardware Threads

---

### What each owns exclusively

**Process**
- Its own **virtual address space** — fully isolated from other processes
- **File descriptor table** — open files, sockets, pipes
- **PID**, security context (UID/GID/capabilities), signal handlers, environment variables, working directory, resource limits

**Software Thread** (lives inside a process)
- Its own **stack** (typically 1–8 MB)
- **Registers + program counter** — the CPU state when it gets scheduled
- **Thread ID**, signal mask, scheduling priority
- **Thread-local storage** (variables marked `thread_local`)

**Hardware Thread** (the physical execution unit on a CPU core)
- Its own **execution pipeline** (the actual silicon doing work)
- **L1 cache** (instruction + data, 32–64 KB)
- **Physical register file**
- **TLB** (translation lookaside buffer — the cache for virtual→physical address mapping)
- **Branch predictor state**

---

### What they share

| Scope | Shared resource |
|---|---|
| Threads within a process | Heap, globals, code segment, file descriptors, memory mappings |
| Cores on one CPU | L2/L3 cache, memory controller, coherency protocol |
| All cores (NUMA or otherwise) | RAM, I/O subsystem |

---

### Why it matters for code

**Memory safety and isolation**
- After `fork()`, parent and child each get a copy-on-write snapshot — changes in one are invisible to the other.
- Threads see the same heap and globals immediately — requiring mutexes/atomics to prevent data races.

**Performance of context switching**
- Process switch: OS must swap page tables, flush TLB → **1–10 µs**
- Thread switch: just save/restore registers and stack pointer → **100 ns – 1 µs**

**Failure isolation**
- A process crash (segfault, OOM kill) does not take down sibling processes.
- A thread crash (unhandled segfault) kills the entire process, including all other threads in it.

**False sharing (hardware thread concern)**
- Two software threads running on separate cores can fight over the same 64-byte cache line even if they're accessing different variables inside a struct:
  ```c
  // Bad — counter1 and counter2 sit on the same cache line
  struct { int counter1; int counter2; } data;

  // Good — each gets its own cache line
  struct { alignas(64) int counter1; alignas(64) int counter2; } data;
  ```
  This is called **false sharing** — it causes cache coherency traffic between cores and can destroy parallel performance.

**NUMA topology**
- On multi-socket servers, a hardware thread on socket 0 accessing memory allocated on socket 1 pays a ~2–3x latency penalty. This is why high-performance code pins threads to NUMA nodes.

---

### The plain-English rule for when to use each

| Goal | Use |
|---|---|
| Fault isolation, security boundaries, calling unreliable code | **Separate processes** |
| Efficient data sharing, low-latency parallelism within one algorithm | **Software threads** |
| Squeezing out cache/topology performance | **Hardware thread awareness** (affinity, alignment, NUMA) |

The core trade-off is: **processes buy isolation at the cost of communication overhead; threads buy cheap sharing at the cost of requiring synchronization and losing fault isolation**. Hardware threads are the physical substrate that both sit on top of — ignoring their cache and NUMA characteristics is usually fine until performance matters, at which point it becomes the dominant concern.