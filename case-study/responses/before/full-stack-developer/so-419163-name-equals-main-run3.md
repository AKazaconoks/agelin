<!-- before / full-stack-developer / so-419163-name-equals-main / run 3 -->

**Duration**: 26.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## The `if __name__ == "__main__":` Guard

### What does it do?

It checks Python's built-in `__name__` variable. If true, the indented block executes; if false, it's skipped entirely.

---

### When is `__name__` equal to `"__main__"`?

It depends on **how the file is run**:

| Scenario | `__name__` value | Guard block runs? |
|---|---|---|
| `python greet.py` (run directly) | `"__main__"` | Yes |
| `import greet` | `"greet"` | No |
| `from greet import greet` | `"greet"` | No |

When Python runs a file as the **entry point**, it sets `__name__ = "__main__"`. When the file is **imported**, it sets `__name__` to the module's own name.

---

### Why is it there? The practical reason.

It lets a single file serve dual purpose — reusable module **and** standalone script — without side effects on import.

Without the guard:

```python
# greet.py
def greet(name):
    return f"Hello, {name}!"

# No guard — this runs on every import too!
print(greet("Alice"))
```

```python
# app.py
from greet import greet   # Surprise: "Hello, Alice!" prints here too
```

With the guard:

```python
# greet.py
def greet(name):
    return f"Hello, {name}!"

if __name__ == "__main__":
    # Only runs when you do: python greet.py
    print(greet("Alice"))
```

```python
# app.py
from greet import greet   # Clean — no surprise output
print(greet("Charlie"))   # Only this prints
```

The guard is the standard Python idiom for keeping demo/test/startup code from firing as an **unintended side effect** of importing your module.