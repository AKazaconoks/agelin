<!-- after / electron-pro / so-114543-center-element / run 1 -->

**Duration**: 22.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the canonical approaches:

---

### 1. Flexbox (modern, recommended)

```css
#outer {
  display: flex;
  justify-content: center;
}
```

**Why it works:** `display: flex` makes the parent a flex container. `justify-content: center` distributes children along the main axis (horizontal by default), centering the inner div. The child needs no special styles.

---

### 2. `margin: 0 auto` (classic block-level)

```css
#inner {
  width: fit-content; /* or any explicit width, e.g. 50% */
  margin: 0 auto;
}
```

**Why it works:** Block elements fill 100% of their parent's width by default, leaving no room to center. You must constrain `#inner` with a width, then `margin: auto` splits the remaining space equally on left and right, producing centering.

---

### 3. CSS Grid (also modern)

```css
#outer {
  display: grid;
  justify-items: center;
}
```

**Why it works:** `justify-items: center` aligns each grid item to the center of its column track.

---

### Summary

| Approach | Requires width on inner? | Browser support |
|---|---|---|
| Flexbox | No | All current browsers |
| `margin: 0 auto` | Yes | All browsers (incl. IE) |
| Grid | No | All current browsers |

**Default to flexbox.** It needs the least code, no width on the child, and handles multiple children naturally. Use `margin: 0 auto` only when you need IE support or cannot change the parent's display mode.