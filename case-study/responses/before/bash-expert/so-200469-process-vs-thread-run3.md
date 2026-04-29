<!-- before / bash-expert / so-200469-process-vs-thread / run 3 -->

**Duration**: 63.8s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 63.81s > 60s

---
Here is the full breakdown from the agent:

---

## Hardware Threads (SMT / Hyperthreading)

These are physical CPU cores with **duplicate architectural state** but **shared execution units**.

**Owns (per hardware thread):**
- Complete register set (GP, SSE/AVX, flags)
- Program counter / instruction pointer
- Branch predictor state (partially)

**Shares:**
- ALU, FPU, load/store units
- L1/L2 caches (with some partitioning)
- TLB
- Memory subsystem

**Why it matters:** The OS sees these as separate CPUs, but cache-heavy workloads can see contention or even slowdowns — throughput gains are not linear.

---

## OS / Software Threads

A thread is a unit of execution **within** a process.

**Owns:**
- Stack (typically 1–8 MB)
- Register context (saved on context switch)
- Thread-local storage (TLS)
- Signal mask, thread ID, scheduling attributes

**Shares (with other threads in the same process):**
- Entire virtual address space (heap, data, code)
- File descriptor table
- Signal handlers, working directory, uid/gid

```c
pthread_create(&tid, NULL, worker, arg);
// New thread gets own stack, but maps into the SAME address space
// It can dereference any heap pointer the parent holds
```

---

## Processes

A process is a fully isolated execution environment.

**Owns:**
- Complete virtual address space (own page tables)
- Independent file descriptor table
- PID, process group, environment variables
- Resource limits, security context (SELinux, capabilities)

**Shares with other processes:**
- Nothing by default — isolation is enforced by the MMU
- Sharing requires explicit IPC: shared memory (`mmap`), pipes, sockets, message queues

```c
pid_t pid = fork();
// Child gets an identical copy of memory (copy-on-write)
// But it's a SEPARATE address space — writes don't affect parent
```

---

## Key Practical Consequences

### 1. Crash isolation

```c
// Thread fault → entire process dies
void *thread_func(void *arg) {
    *(int*)NULL = 42;  // Segfault kills ALL threads
}

// Process fault → only the child dies
if (fork() == 0) {
    *(int*)NULL = 42;  // Parent survives, gets SIGCHLD
}
```

### 2. Synchronization burden

Threads share memory → you *must* synchronize every shared write:

```c
pthread_mutex_lock(&mutex);
shared_counter++;          // race condition without this
pthread_mutex_unlock(&mutex);
```

Processes share nothing by default → no accidental races, but explicit IPC is required:

```c
sem_wait(sem);
// operate on shared memory segment
sem_post(sem);
```

### 3. Data sharing cost

- **Threads:** zero-copy — just pass a pointer.
- **Processes:** must serialize (pipe) or set up shared memory (`shm_open` + `mmap`), which has setup overhead and is more error-prone.

### 4. File descriptor lifetime

- **Threads:** `close(fd)` in one thread closes it for *all* threads.
- **Processes:** after `fork()`, child and parent have independent FD tables — closing in child does not affect parent.

---

## Context-Switch Cost (rough order of magnitude)

| Level | Cost |
|---|---|
| Hardware thread switch | ~1–10 cycles |
| OS thread switch | ~1,000–10,000 cycles |
| Process switch | Similar to thread, plus potential extra TLB/cache invalidation |

---

## Decision Guide

| Situation | Use |
|---|---|
| High-throughput shared data, low latency | Threads |
| Fault isolation (one bad actor must not take down the rest) | Processes |
| Security boundary between components | Processes |
| CPU-bound work, cache-aware tuning | Thread affinity + hardware thread awareness |
| Avoiding shared-state bugs entirely | Processes + explicit IPC |

**Core tradeoff:** processes give you strong isolation at the cost of communication overhead; threads give you cheap communication at the cost of isolation — a bug, leak, or crash in any thread is a bug in the whole process.