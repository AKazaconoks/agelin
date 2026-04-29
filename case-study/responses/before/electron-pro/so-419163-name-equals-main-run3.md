<!-- before / electron-pro / so-419163-name-equals-main / run 3 -->

**Duration**: 32.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's what the `if __name__ == "__main__":` guard does:

---

## What it does

It checks whether the current file is being **run directly** by Python or **imported** by another module. If run directly, the block executes. If imported, it's skipped.

---

## How `__name__` gets its value

Python sets `__name__` automatically depending on how the file is loaded:

| How the file is used | `__name__` value | Guard runs? |
|---|---|---|
| `python file.py` | `"__main__"` | Yes |
| `import file` from another module | `"file"` | No |
| `python -m package` | `"__main__"` | Yes |

---

## Why it exists

Python has no formal distinction between a "script" and a "library" — any `.py` file can serve both roles. Without this guard, **any top-level code runs unconditionally on import**, causing unintended side effects (printing output, launching servers, mutating state) just because another module needed a function from that file.

**Without the guard — broken:**
```python
# bad_module.py
def useful_function():
    return 42

print("Runs every time this is imported!")  # <-- side effect on import
```

**With the guard — correct:**
```python
# good_module.py
def useful_function():
    return 42

if __name__ == "__main__":
    print("Only runs when executed directly")
```

---

## Common things that belong inside the guard

- `argparse` / CLI argument parsing
- Server startup calls (`app.run()`)
- Expensive initialization
- Quick demos or smoke tests

The core principle: **importing a module should never produce side effects.** The guard enforces that cleanly.