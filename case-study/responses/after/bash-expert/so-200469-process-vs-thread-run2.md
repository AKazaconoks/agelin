<!-- after / bash-expert / so-200469-process-vs-thread / run 2 -->

**Duration**: 56.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is a clean synthesis of the agent's answer:

---

## Process vs Thread: What Each Owns, Shares, and Why It Matters

### The Three Distinct Concepts

The word "process" is indeed precise at the OS level, but people conflate three separate things:

| Concept | What it is |
|---|---|
| **Process** | An OS-managed execution context with its own isolated address space |
| **Software thread** (OS thread) | A unit of execution *within* a process — scheduled by the OS |
| **Hardware thread** (CPU core / hyperthread) | A physical execution pipeline on the CPU |

---

### What Each Owns Exclusively

**Process owns:**
- Its own **virtual address space** (fully isolated from other processes)
- Its own **file descriptor table** (open files, sockets, pipes)
- Its own **PID**, security context, environment variables, signal handlers

**Software thread owns:**
- Its own **stack** (typically 1–8 MB)
- Its own **register state** (program counter, stack pointer, etc.)
- Its own **thread-local storage**

**Hardware thread owns:**
- A physical **execution pipeline** (fetch/decode/execute)
- Its own **L1 cache** (L2 may be private or shared; L3 is usually shared across cores)

---

### What They Share

**Threads within the same process share:**
- The entire **heap** and all dynamically allocated memory
- **Global and static variables**
- All **open file descriptors**
- All **memory-mapped files and shared libraries**

This sharing is what makes threads fast but dangerous — any thread can corrupt any other thread's data if you're not careful.

**Hardware threads (cores) share:**
- **L3 cache** and memory controllers
- The **memory bus** to RAM
- On hyperthreaded cores, some execution units are physically shared

---

### Why This Matters When Writing Code

**1. Synchronization cost scales with sharing**

- Between processes: you need explicit IPC (pipes, shared memory + semaphores, sockets). It's expensive but safe — a bug in one process can't corrupt another.
- Between threads: cheaper (mutexes, atomics, condition variables), but a single missing lock can silently corrupt shared state.

**2. Classic thread bugs all trace back to shared memory**

- **Race condition**: two threads read-modify-write a variable without a lock
- **Deadlock**: thread A holds lock 1 and waits for lock 2; thread B holds lock 2 and waits for lock 1
- **Use-after-free**: thread A frees a heap allocation while thread B still holds a pointer to it

**3. Hardware thread effects are performance bugs, not correctness bugs**

- **False sharing**: two threads modify *different* variables that happen to sit on the same 64-byte cache line. The CPU bounces that line between cores constantly, killing performance — even though there's no logical sharing.
- **Oversubscription**: spawning more OS threads than hardware threads means the OS spends time on context switches rather than real work. For CPU-bound work, `thread count ≈ core count` is the target. For I/O-bound work, you can have more threads because most of them are sleeping.

**4. The isolation question drives the architecture decision**

- Use **processes** when you need isolation: a crash or bug in one worker shouldn't take down others (web servers like nginx use this model). Also use processes when untrusted code is involved.
- Use **threads** when you need fast communication and low overhead: a video encoder parallelizing frames, a game engine's render/logic/audio split, a database's connection pool.

---

### The One-Line Summary for Each

- **Process**: owns its memory — the OS enforces isolation at hardware level.
- **Software thread**: borrows the process's memory — you enforce isolation in your code with locks.
- **Hardware thread**: a physical core — the CPU enforces cache coherency, but you control whether you use cores efficiently.