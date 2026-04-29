<!-- after / full-stack-developer / so-114543-center-element / run 2 -->

**Duration**: 27.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

### Approach 1 — Flexbox (Modern)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` activates the Flexbox layout model on the parent, making direct children *flex items* laid out along a horizontal *main axis* by default. `justify-content: center` splits any leftover space equally on both sides of the child — no width on the inner div needed.

---

### Approach 2 — `margin: 0 auto` (Classic)

```css
#inner {
    width: fit-content; /* or any explicit width: 50%, 200px, etc. */
    margin: 0 auto;
}
```

**Why it works:** Block-level elements (`<div>` by default) fill their container's full width. Give the child a width narrower than its parent and horizontal space is left over. The CSS spec says `margin-left: auto` + `margin-right: auto` each get exactly *half* of that leftover space, pushing the box to the center. The width is a prerequisite — without it, there is no leftover space to distribute.

---

### Quick Comparison

| | Flexbox | `margin: auto` |
|---|---|---|
| Applied to | **Parent** | **Child** |
| Child width required | No | Yes |
| Vertical centering too | Yes (`align-items: center`) | No |
| Browser support | All current browsers | All browsers incl. legacy IE |

**Use Flexbox for new work.** It is more expressive, requires no width on the child, and extends naturally to 2D centering. Reach for `margin: 0 auto` only in legacy codebases or when IE support is needed.