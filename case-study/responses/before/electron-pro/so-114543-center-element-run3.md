<!-- before / electron-pro / so-114543-center-element / run 3 -->

**Duration**: 29.3s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

### 1. Flexbox (Modern — Recommended)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` makes the outer div a flex container, treating its children as flex items. `justify-content: center` distributes remaining horizontal space equally on both sides of `#inner`, pushing it to the center. No width needed on the inner element, and it extends easily to vertical centering with `align-items: center`.

---

### 2. `margin: auto` on a Block Element (Classic)

```css
#inner {
    width: 50%; /* or any explicit value like 300px */
    margin: 0 auto;
}
```

**Why it works:** The CSS block model requires `margin-left + width + margin-right = container width`. When both side margins are `auto`, the browser splits the leftover space equally — centering the element. The critical requirement is an **explicit width**: without one, a block `div` fills 100% of its container, leaving no space for the margins to absorb.

---

### Key Differences

| | Flexbox | `margin: auto` |
|---|---|---|
| Applied to | **outer** container | **inner** element |
| Requires explicit width on inner? | No | **Yes** |
| Extends to vertical centering? | Yes | No |
| Works on inline elements? | Yes | No |

**Default to Flexbox.** Use `margin: 0 auto` when you want a fixed-width block centered in its parent (e.g., a page-wrapper `div` inside `body`) — that remains a classic, perfectly valid pattern.