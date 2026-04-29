<!-- after / electron-pro / so-200469-process-vs-thread / run 2 -->

**Duration**: 126.3s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 126.27s > 60s

---
Here is a precise breakdown of the full hierarchy:

---

## The Three Layers of "Thread"

People say "thread" to mean three different things. Keeping them distinct is the whole game:

```
Hardware thread  — physical execution slot in silicon (few)
  OS thread      — kernel scheduling unit, mapped M:N onto hardware (many)
    Process      — isolation container (address space, FDs, credentials)
      Thread(s)  — execution units inside a process (share address space)
```

---

## What Each Thing Owns vs. Shares

### Process
The kernel allocates it a **private virtual address space** (code, heap, stack region, mapped files), a **file descriptor table**, signal handlers, credentials, and resource limits. A child process from `fork()` gets a copy-on-write *snapshot* — after the fork, mutations in one are invisible to the other.

### OS Thread (inside a process)
Each thread privately owns:
- **Stack** (typically 1–8 MB on Linux, 1 MB on Windows) — local variables, return addresses
- **Register file** — instruction pointer, general-purpose registers, SIMD state — saved/restored on every context switch
- **Thread-local storage (TLS)** — `errno` is the canonical example; it's `__thread int errno` so two threads don't clobber each other's error code
- **Signal mask**

Threads **share everything the process owns**: the heap, all globals, every file descriptor, every memory-mapped region. `write(fd, ...)` from two threads hits the *same* open file description — the offset is shared and races unless you use `pwrite` with explicit offsets.

---

## Hardware Threads vs. Software Threads

**Hardware thread** (logical CPU / hyper-thread): a physical execution context inside a CPU core with its own register file and instruction pointer. A core with Intel/AMD SMT exposes *two* hardware threads that share the core's ALUs, FPUs, and L1/L2 cache. The CPU multiplexes them cycle-by-cycle. A 16-core/2-way-SMT machine reports 32 logical CPUs to the OS.

Practical consequence: two OS threads pinned to the same physical core's SMT siblings compete for execution units. Benchmarks assuming `N logical CPUs = N-way compute parallelism` can be wrong.

**OS (kernel) thread**: the scheduler maps these onto hardware threads. At most `N_hardware_threads` run truly simultaneously; the rest are waiting. A context switch (~1–10 µs) saves and restores the register file.

**Green thread / goroutine / async task**: user-space scheduled, not visible to the kernel. Go goroutines start at 2 KB of stack vs. 1+ MB for an OS thread. Switching costs ~100–200 ns instead of 1–10 µs. The catch: a blocking syscall parks the underlying OS thread, stalling every green thread on it — which is why Go's runtime uses `epoll`/`kqueue` under the hood.

---

## Why It Matters for Code

**Race conditions come from shared mutable state.** `counter++` is three instructions (LOAD, ADD, STORE). The OS can preempt between any two:

```c
// Thread 1: LOAD 5 → ADD → STORE 6
// Thread 2: LOAD 5 (stale!) → ADD → STORE 6
// Result: 6 instead of 7. One increment silently lost.
```

Processes don't share address space, so this class of bug is impossible across them. You trade it for IPC complexity.

**Memory ordering matters even for single variables.** Hardware reorders stores; on ARM especially, a `bool ready = true` store may be reordered before the data write it was meant to signal. C++11 `std::atomic` with `memory_order_release`/`acquire` is the fix — not just atomicity but ordering.

**Isolation vs. sharing is the central tradeoff:**

| | Process | OS Thread | Green Thread |
|---|---|---|---|
| Memory isolation | Full | None | None |
| Crash isolation | Yes | No | No |
| Communication cost | High (IPC, syscalls) | Low (pointer deref) | Low |
| Creation cost | High (`fork` = ms) | Medium (~µs) | Low (~ns) |
| Context switch | ~5–20 µs (TLB flush) | ~1–10 µs | ~100–200 ns |

**Rule of thumb:**
- Use **separate processes** when a crash in one component must not kill the others (browser tabs, sandboxed workers), or when security isolation matters.
- Use **threads** when components share large in-memory state and IPC latency would dominate.
- Use **green threads/async** when you have thousands of concurrent I/O-bound tasks and can't afford 1–8 MB of stack per connection.

The key insight: every step toward isolation costs communication bandwidth; every step toward sharing costs correctness complexity. Where you draw that boundary is almost always the central architectural decision in a concurrent system.