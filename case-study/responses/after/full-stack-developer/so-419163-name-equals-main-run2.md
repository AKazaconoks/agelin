<!-- after / full-stack-developer / so-419163-name-equals-main / run 2 -->

**Duration**: 32.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's a thorough explanation of `if __name__ == "__main__":`:

---

## What the `if` statement does

It checks whether the current file is being **run directly** or **imported** as a module. Code inside the block only executes in the first case.

---

## The `__name__` variable

Python automatically sets `__name__` on every module, and its value depends on *how* the file is being used:

| Scenario | Value of `__name__` |
|---|---|
| `python myfile.py` (run directly) | `"__main__"` |
| `import myfile` (imported) | `"myfile"` (the filename without `.py`) |

---

## Concrete example

**`greet.py`:**
```python
def say_hello(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    print(say_hello("Alice"))  # only runs when executed directly
```

**`main.py`:**
```python
import greet  # the if-block in greet.py is SKIPPED

print(greet.say_hello("Bob"))  # works fine
```

**Output:**
```
$ python greet.py
Hello, Alice!

$ python main.py
Hello, Bob!       # greet.py's if-block never fires
```

---

## Why it matters: the problem without the guard

```python
# no_guard.py
def say_hello(name):
    return f"Hello, {name}!"

print(say_hello("Alice"))  # no guard — runs on import too!
```

```python
import no_guard  # surprise: prints "Hello, Alice!" immediately
```

Without the guard, importing a module triggers all its top-level side effects — almost never what you want.

---

## Practical reason

The guard lets a single `.py` file serve **two roles at once**:
- As a **reusable library** (safe to import, no side effects)
- As a **runnable script** (entry-point logic executes when run directly)

This is why you'll see it at the bottom of nearly every Python script that also defines reusable functions or classes.