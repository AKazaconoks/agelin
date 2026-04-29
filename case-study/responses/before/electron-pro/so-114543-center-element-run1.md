<!-- before / electron-pro / so-114543-center-element / run 1 -->

**Duration**: 29.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

## 1. Flexbox (Modern — Recommended)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` makes the parent a flex container. `justify-content: center` distributes children along the horizontal main axis, pushing `#inner` to the center. The child needs no special styling.

**Bonus:** Add `align-items: center` to also center vertically with no extra effort.

---

## 2. `margin: 0 auto` (Classic Block-Level)

```css
#inner {
    width: fit-content; /* or any explicit width: 50%, 200px, etc. */
    margin: 0 auto;
}
```

**Why it works:** A `<div>` normally stretches to fill its parent's full width, leaving no room to distribute. Constraining the child's width creates leftover horizontal space on both sides. `margin: auto` on left/right tells the browser to split that remaining space equally — centering the element.

**Requirement:** The child **must** have an explicit width. Without it, there is no space to split.

---

## Quick Comparison

| | Flexbox | `margin: auto` |
|---|---|---|
| Child needs explicit width | No | Yes |
| Who drives alignment | Parent | Child |
| Extends to vertical centering | Yes (trivially) | No |
| Browser support | All modern browsers | Universal (including legacy) |

**Rule of thumb:** Default to Flexbox. Use `margin: 0 auto` when you want a self-contained centered column (e.g., `max-width: 960px; margin: 0 auto`) or need legacy browser support.