<!-- before / electron-pro / so-419163-name-equals-main / run 1 -->

**Duration**: 39.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough breakdown:

---

## What `if __name__ == "__main__":` does

Python sets a special built-in variable `__name__` for every file it loads:

| How the file is used | `__name__` value |
|---|---|
| `python my_module.py` (run directly) | `"__main__"` |
| `python -m my_module` (run as module) | `"__main__"` |
| `import my_module` (imported) | `"my_module"` |
| `from my_module import x` (imported) | `"my_module"` |

The `if` block only runs when the file is the **entry point** — i.e., when you run it directly. It is **skipped on import**.

---

## Why it matters: Python runs all top-level code on load

Without the guard, any top-level code runs automatically when the file is imported — which is almost never what you want:

```python
# math_utils.py WITHOUT guard — broken
def add(a, b):
    return a + b

print(add(2, 3))  # This fires on every import too!
```

```python
# main.py
import math_utils  # Side effect: prints "5" unexpectedly
```

---

## With the guard — correct

```python
# math_utils.py WITH guard
def add(a, b):
    return a + b

if __name__ == "__main__":
    print(add(2, 3))  # Only runs when executed directly
```

Now `import math_utils` is clean — only the function definition is loaded.

---

## The practical reason: dual-purpose files

The guard lets a single file serve as **both an importable library and a standalone script**. It separates:

- **Definitions** (functions, classes, constants) — always loaded
- **Execution** (script logic, CLI entry point, tests/demos) — only when run directly

This is considered best practice even for simple scripts, because it keeps files composable and testable by other modules.