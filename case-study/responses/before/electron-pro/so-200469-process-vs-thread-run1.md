<!-- before / electron-pro / so-200469-process-vs-thread / run 1 -->

**Duration**: 143.2s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 143.24s > 60s

---
Here is a thorough technical breakdown from the agent:

---

## Processes, Threads, and Hardware: A Concrete Technical Breakdown

The core idea is **ownership vs. isolation**. Every concurrency bug traces back to: *who owns this resource, and who else can touch it?*

---

### What a Process Owns

A process is the OS's unit of **isolation**. It gets a private universe:

- **Virtual address space** — the most important resource. The MMU gives each process the illusion it owns the entire address space via a per-process **page table**. A pointer in process A is meaningless in process B because their page tables are completely separate.
- **File descriptor table** — an integer-indexed table of open files, sockets, pipes. Other processes have their own separate tables.
- **Signal disposition table** — which signals are caught, ignored, or defaulted.
- **PCB (Process Control Block)** — PID, credentials, resource limits, working directory.

**When you fork():** The kernel copies the page table (not the physical RAM — it uses **Copy-on-Write**). Both parent and child point to the same physical pages, marked read-only. The first write to any page triggers a fault, and the kernel gives each process its own private copy of that 4KB page. This is why forking is cheap upfront but costs appear as pages are written.

---

### What Threads Own vs. Share

A thread is the OS's unit of **execution**. All threads in a process share the same page table (same heap, same globals).

**Each thread privately owns:**
- Its own **stack** (default 8MB on Linux) — local variables, call frames, return addresses
- Its **CPU register set** when scheduled (instruction pointer, stack pointer, general-purpose registers); saved/restored on context switch
- **Thread-Local Storage (TLS)** — variables declared `thread_local`; the runtime uses segment registers (FS/GS on x86) to point each thread at its own TLS block. This is why `errno` is thread-local — otherwise a syscall error in thread A would corrupt thread B's error code.
- Its own **signal mask**

**All threads in a process share:**
- The heap (`malloc`/`free` use locks internally because of this)
- Global and static variables
- Memory-mapped files
- The file descriptor table

---

### Hardware Threads vs. OS Threads

These are completely different concepts that share the word "thread."

**A CPU core** executes one instruction stream through a pipeline. The bottleneck is memory latency — a cache miss can idle execution units for 200+ cycles.

**Hyper-Threading / SMT** (Intel HT, AMD SMT) duplicates *some* hardware per core so two instruction streams can share one set of execution units:
- **Duplicated:** register files (two complete sets), instruction pointers, branch predictor state
- **Not duplicated:** ALUs/FPUs, L1/L2 cache, TLB

When hardware thread 0 stalls on a cache miss, hardware thread 1's instructions fill the execution slots. A 4-core/8-thread CPU presents 8 logical CPUs to the OS — it schedules OS threads onto them without knowing they share physical resources. This is why HT gives ~15–30% improvement for memory-bound workloads, and can *hurt* compute-bound workloads where both hardware threads fight for the same ALUs.

**The three-level mapping:**
```
Hardware Thread (logical CPU)
  └── OS/Software Thread (kernel task_struct: registers, stack, scheduler state)
        └── Process (virtual address space, file descriptors, credentials)
```

There is also a fourth level: **green threads / user-space threads** (Go goroutines, Rust async tasks, Python asyncio). These are managed by the runtime, not the kernel — 100,000 goroutines can multiplex onto 8 OS threads. Context switching between them is cheap because it skips the kernel trap.

---

### Why This Matters in Code

**Race conditions at the hardware level**

`counter++` compiles to three instructions: load → add → store. The OS can preempt a thread between any two of them. If two threads both load the old value, both increment, and both store, you get one increment instead of two. The fix is a CPU `LOCK XADD` (what `std::atomic` maps to), which holds the cache line exclusive until the entire read-modify-write completes.

**Memory visibility / ordering**

CPUs have store buffers and perform out-of-order execution. One thread writing a variable does not mean another thread immediately sees it. The broken double-checked locking pattern is the classic example: the CPU can write the pointer *before* the constructor finishes initializing the object. The fix is `std::atomic` with acquire/release semantics, which inserts memory fences.

**Dangling pointers across thread boundaries**

```c
void start_task() {
    int result = 0;                 // lives on this thread's stack
    spawn_thread(worker, &result);  // dangerous: stack frame may be gone before thread finishes
}
```

If `start_task()` returns before the spawned thread finishes, the stack frame is gone and the thread has a dangling pointer causing silent corruption.

**Fork + threads = deadlock**

`fork()` in a multi-threaded process copies only the calling thread into the child. Any locks held by other threads are still locked in the child. If the child tries to `malloc` (which acquires an internal lock), it deadlocks immediately. This is why forking in multi-threaded programs almost always immediately calls `exec()`.

**File descriptor races**

Threads share the FD table. If thread A closes an FD while thread B is using it, thread B gets `EBADF` — or worse, if a new file opens with the same FD number, thread B silently operates on the wrong file.

**False sharing — a hardware-level bug**

Two threads each have their own variable (no logical sharing), but if those variables land on the same 64-byte cache line, the cache coherency protocol treats the entire line as contested. Thread A writing its variable forces Thread B's core to re-fetch the whole cache line to read its unrelated variable. This causes 10x slowdowns at high core counts with no logical bug in the code. Fix: `alignas(64)` to force each variable onto its own cache line.

---

### Summary

| Resource | Process | Thread (shared) | Thread (private) |
|---|---|---|---|
| Virtual address space | Owns it | Shared | — |
| Heap | Owns it | Shared | — |
| Stack | Contains N stacks | — | Owns its own |
| File descriptors | Owns the table | Shared | — |
| CPU registers | — | — | Private when scheduled |
| Global variables | Owns | Shared | TLS vars are private |
| Signal handlers | Process-wide | Shared | Signal mask is private |

**The foundational rule:** isolation is expensive, sharing is dangerous. Processes pay in fork overhead, IPC mechanisms, and TLB-flushing context switches. Threads skip that cost but require you to reason carefully about every shared resource, its lifetime, and the ordering of operations on it. Hardware threads add a physical layer where even "my core, my data" breaks down at the 64-byte cache line level.