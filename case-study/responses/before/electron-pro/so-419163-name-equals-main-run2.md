<!-- before / electron-pro / so-419163-name-equals-main / run 2 -->

**Duration**: 47.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full explanation from the agent:

---

## What `if __name__ == "__main__":` Does

### 1. What is `__name__`?

`__name__` is a **special variable** Python automatically sets on every module at load time. You never assign it — the interpreter manages it.

| How the file is used | Value of `__name__` |
|---|---|
| Run directly (`python myfile.py`) | `"__main__"` |
| Imported by another module (`import myfile`) | `"myfile"` (the filename without `.py`) |

`__main__` is Python's reserved name for the **top-level execution environment** — the script the interpreter was explicitly asked to run.

---

### 2. When It's `"__main__"` vs When It Isn't

- **Run directly** (`python greet.py`) → `__name__` is `"__main__"` — this file *is* the entry point.
- **Imported** (`import greet`) → `__name__` is `"greet"` — this file is a dependency being loaded by something else.

---

### 3. Why the Guard Exists

Without the guard, **every line of top-level code runs the moment the module is imported**. That's fine for definitions (functions, classes, constants), but not for executable script logic like printing output, starting servers, or running computations.

The guard lets one file serve **two roles simultaneously**:
1. A **reusable library** — other modules can safely import its functions.
2. A **runnable script** — users can execute it directly and trigger the guarded logic.

---

### 4. Concrete Example

**Without the guard (broken):**
```python
# calculator.py
def add(a, b): return a + b

# Top-level script logic — always runs on import
print("Running demo...")
print(f"10 + 5 = {add(10, 5)}")
```

```python
# app.py
import calculator  # just wants to use add()
print(calculator.add(100, 200))
```

Output of `python app.py`:
```
Running demo...       ← UNWANTED side effect from import
10 + 5 = 15          ← UNWANTED
300
```

**With the guard (correct):**
```python
# calculator.py
def add(a, b): return a + b

def main():
    print("Running demo...")
    print(f"10 + 5 = {add(10, 5)}")

if __name__ == "__main__":
    main()
```

- `python calculator.py` → prints the demo (guard is `True`)
- `python app.py` → guard is `False` (`__name__` is `"calculator"`), demo is silently skipped, only `300` prints

---

### Summary

| Concept | Detail |
|---|---|
| What goes **inside** the guard | Entry-point logic: argument parsing, startup calls, demos |
| What goes **outside** the guard | Definitions: functions, classes, constants — anything reusable |
| Best practice | Put the guarded logic in a `main()` function so it's also directly testable |