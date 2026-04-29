<!-- before / bash-expert / so-200469-process-vs-thread / run 1 -->

**Duration**: 87.8s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 87.84s > 60s

---
Here is the full technical breakdown:

---

## Process: The Fundamental Unit of Resource Ownership

A **process** is an independent execution context — a protective container the OS uses to isolate a running program.

### What a Process Owns
- **Virtual address space** — its own complete memory layout (stack, heap, code, data segments)
- **PID** — unique system identifier
- **File descriptor table** — open files, sockets, pipes (independent per process, even if fd numbers collide)
- **Signal handlers**, **environment variables**, **working directory**
- **Credentials** (UID/GID), **resource limits**

```c
// Address 0x1000 in Process A and Process B map to *different* physical memory
int global_var = 42;  // Process A: 42, Process B: can be 99 — completely isolated
```

---

## Thread: An Execution Path Within a Process

A **thread** is the actual unit that gets CPU time. Multiple threads share the same process container.

### What Threads Own (Private)
- **Stack** — local variables, function frames, return addresses
- **Registers** — PC, SP, general-purpose register state
- **Thread-local storage (TLS)** — `__thread` in C, `threading.local()` in Python

### What Threads Share (Within the Process)
- **Heap** — all `malloc`'d memory, globals
- **Code segment** — the program instructions
- **File descriptors** — all threads see the same open files
- **Signal handlers**, **PID**

```c
int shared_global = 0;           // Shared — all threads see same variable
__thread int thread_private = 0; // Private — each thread has its own copy

void* worker(void* arg) {
    int stack_local = 42;        // Private — on this thread's stack
    shared_global++;             // RACE CONDITION — needs synchronization
    thread_private = 1;          // Safe — thread-local
}
```

---

## Hardware Threads vs Software Threads

These are two completely different uses of the word "thread":

### Hardware Threads (Logical CPUs)
These are execution units exposed by the CPU itself — the result of **SMT (Simultaneous Multithreading)** (Intel calls it Hyper-Threading, AMD calls it SMT). Two hardware threads per physical core means the core can keep two execution contexts in-flight, filling pipeline stalls with work from the other context.

```bash
$ lscpu | grep -E "CPU\(s\)|Thread|Core"
CPU(s):              8
Thread(s) per core:  2     # SMT enabled
Core(s) per socket:  4
# Result: 4 physical cores × 2 hardware threads = 8 logical CPUs
```

Hardware threads within a core **share execution units** (ALUs, FPUs) but have **separate register files** and **instruction pointers**. They also share L1/L2 caches, which is both a benefit (warm cache on shared data) and a hazard (cache line contention).

### Software Threads (OS Scheduling Units)
These are what your program creates with `pthread_create`, `std::thread`, `goroutine`, etc. The OS scheduler maps these onto available hardware threads. You can have 10,000 software threads on an 8-hardware-thread machine — the OS time-multiplexes them.

```c
// 1000 software threads on an 8-core machine
for (int i = 0; i < 1000; i++)
    pthread_create(&threads[i], NULL, worker, NULL);
// The OS multiplexes all 1000 across 8 hardware threads
```

---

## Why These Distinctions Matter in Code

### 1. Race Conditions
Processes can't accidentally share state. Threads can and do:
```c
// Threads share the heap — this is a race:
shared_counter++;  // read-modify-write is not atomic

// Fix:
pthread_mutex_lock(&mutex);
shared_counter++;
pthread_mutex_unlock(&mutex);
```

### 2. IPC Cost
Thread communication = nanoseconds (direct memory write).  
Process communication = microseconds (kernel-mediated pipe/socket/shm).

### 3. Fork Safety
`fork()` only copies the calling thread. If other threads held mutexes, the child inherits locked mutexes with no thread to unlock them — instant deadlock.

### 4. The GIL (Python)
Python's GIL serializes CPU-bound threads. If you want true parallelism in Python, you need *processes* (each gets its own interpreter + GIL), at the cost of higher memory and IPC overhead.

```python
# Threads: GIL limits CPU parallelism
threading.Thread(target=cpu_work).start()  # Only one runs at a time

# Processes: true parallelism
with multiprocessing.Pool() as pool:
    pool.map(cpu_work, [10**6] * 4)  # Runs in parallel
```

### 5. Cache Coherence
Threads on the same physical core share L1/L2 cache — fast if they work on the same data, but **false sharing** (two threads writing adjacent cache lines) can be slower than single-threaded due to coherence traffic. Thread affinity (`pthread_setaffinity_np`) lets you pin threads to specific hardware threads to control this.

### 6. Fault Isolation
A process crash (SIGSEGV) is contained — other processes continue. A thread crash or heap corruption can kill every thread in the process.

---

## Cheat Sheet

| | Process | Software Thread | Hardware Thread |
|---|---|---|---|
| **Owner** | OS | OS scheduler | CPU silicon |
| **Address space** | Own | Shared with process | N/A |
| **Stack** | Own | Own | Register file / IP |
| **Creation cost** | High (fork + exec) | Medium | Fixed (physical) |
| **Communication** | IPC (pipes, shm) | Shared memory | Shared cache |
| **Failure scope** | Isolated | Kills process | N/A |

**Rule of thumb**: use threads for I/O concurrency or shared-state work within one logical program; use processes for fault isolation, CPU parallelism under a GIL, or truly independent workloads.