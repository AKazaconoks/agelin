<!-- after / electron-pro / so-419163-name-equals-main / run 2 -->

**Duration**: 31.8s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Python's `if __name__ == "__main__":` Explained

---

### 1. What does this `if` statement do?

It checks the value of a built-in variable called `__name__`. If that variable equals the string `"__main__"`, the indented block runs — in this case, `print("Hello, World!")`. If the condition is false, the block is skipped entirely.

---

### 2. Why is it there?

Python sets `__name__` automatically on every module it loads. Its value depends on *how* the file was launched. The `if` statement acts as a **guard**: it lets you designate certain code as "only run this when the file is the entry point," while keeping the rest of the file safely importable by other modules without side effects.

---

### 3. When is `__name__` equal to `"__main__"` and when isn't it?

**When it equals `"__main__"`:**
- You run the file directly from the terminal: `python my_script.py`
- Python sees this file as the program's starting point and sets `__name__ = "__main__"` automatically.

**When it does NOT equal `"__main__"`:**
- Another file imports it: `import my_script`
- In that case, Python sets `__name__` to the module's own name — e.g., `"my_script"` — not `"__main__"`.
- The entry point of *that other program* is what gets `__name__ == "__main__"`.

So at any given moment, exactly **one** module in a running Python program has `__name__ == "__main__"` — the one that was directly executed.

---

### 4. What is the practical reason to include this check?

Imagine you write a file `utils.py` that defines some helper functions but also has a block of code at the bottom that runs a demo or a test:

```python
# utils.py

def add(a, b):
    return a + b

# Without the guard:
print(add(2, 3))  # This runs EVERY time utils.py is imported — unwanted!
```

Any file that does `import utils` would trigger that `print` as an unintended side effect. The guard prevents this:

```python
# utils.py

def add(a, b):
    return a + b

if __name__ == "__main__":
    print(add(2, 3))  # Only runs when you execute utils.py directly
```

The four concrete benefits this gives you:

| Benefit | Explanation |
|---|---|
| **Reusability** | Other modules can import your functions without triggering your script's side effects. |
| **Testability** | Test frameworks (pytest, unittest) import your file to find test functions; the guard stops your "main" logic from firing during test collection. |
| **Clarity** | It signals to any reader exactly where the program's manual entry point is. |
| **Dual-purpose files** | A file can serve as both a standalone script *and* a reusable library, with no changes required. |

---

### The mental model in one sentence

`if __name__ == "__main__":` is Python's way of saying: **"only execute this block if the user ran *this* file on purpose, not if someone else imported it."**