<!-- before / full-stack-developer / so-419163-name-equals-main / run 1 -->

**Duration**: 48.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Understanding `if __name__ == "__main__":`

### What `__name__` Is

Every Python module has a built-in `__name__` attribute. Python sets it automatically based on **how the file is being used**:

| Scenario | `__name__` value |
|---|---|
| File is **run directly** | `"__main__"` |
| File is **imported** | The module's filename (without `.py`) |

---

### A Concrete Demo

**`greeter.py`**
```python
print(f"__name__ is '{__name__}'")

def greet(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    print("Running directly!")
    print(greet("World"))
```

```bash
$ python greeter.py
__name__ is '__main__'
Running directly!
Hello, World!

$ python -c "import greeter; print(greeter.greet('Alice'))"
__name__ is 'greeter'       # <-- NOT __main__, so the if-block is skipped
Hello, Alice!
```

---

### Why the Guard Exists

When Python **imports** a module, it executes the entire file top-to-bottom. Every top-level statement runs. Without the guard, any side effects (printing, computations, starting servers) would fire every time someone imports your module — almost never desired.

The guard creates a block that **only runs when the file is the entry point**.

---

### Four Practical Reasons to Use It

**1. Dual-purpose files (library + script)**  
A file can expose importable functions and also work as a standalone CLI tool.

**2. Preventing test framework side effects**  
`pytest` imports your modules to discover tests. Without the guard, top-level script code runs during test collection — a server start would hang the suite.

**3. Multiprocessing on Windows** (explicitly required)  
Windows lacks `fork`, so `multiprocessing` re-imports the main script in each worker. Without the guard, each worker spawns more workers infinitely.

**4. Quick manual tests alongside library code**  
```python
def add(a, b):
    return a + b

if __name__ == "__main__":
    print(add(2, 3))  # only runs when you directly execute this file
```

---

### The One-Line Mental Model

```
python myfile.py     →  __name__ == "__main__"  →  if-block RUNS
import myfile        →  __name__ == "myfile"    →  if-block SKIPPED
```

It answers: **"Am I being run, or am I being used?"** — letting one file serve as both a runnable script and an importable module without the two roles interfering.