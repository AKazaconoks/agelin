<!-- after / electron-pro / so-114543-center-element / run 3 -->

**Duration**: 24.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

### 1. Flexbox (modern, recommended)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` makes the parent a flex container, with children laid out along the horizontal main axis by default. `justify-content: center` distributes that axis so all children sit in the middle. The inner `div` needs no special styling — no explicit width required.

---

### 2. `margin: 0 auto` (classic block-level approach)

```css
#inner {
    width: 50%;   /* any explicit width less than 100% */
    margin: 0 auto;
}
```

**Why it works:** A block element stretches to fill its parent by default, leaving zero free space. Give it an explicit `width` and leftover horizontal space appears. Setting both horizontal margins to `auto` splits that leftover space equally, pushing the element to the center. Without the explicit width, there's no space to split and `auto` does nothing.

---

### At a glance

| | Flexbox | `margin: auto` |
|---|---|---|
| Width required on inner `div` | No | Yes |
| Styling goes on | Parent | Child |
| Multiple children | Centers all at once | Each needs its own margin |
| Browser support | All current browsers | All browsers incl. legacy IE |

**Recommendation:** Use flexbox for new work — it's more flexible and requires no width constraint on the child.