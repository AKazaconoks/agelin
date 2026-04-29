<!-- before / full-stack-developer / so-114543-center-element / run 3 -->

**Duration**: 27.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

## 1. Flexbox (Modern)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` activates the Flexbox layout model on the container, making all direct children *flex items*. `justify-content: center` distributes those items along the horizontal main axis, placing them at the midpoint. No width is needed on the inner element — Flexbox calculates the remaining space automatically.

---

## 2. `margin: 0 auto` (Classic block-level)

```css
#inner {
    width: 50%; /* required — any value < 100% */
    margin: 0 auto;
}
```

**Why it works:** Block elements normally stretch to fill their parent's full width, leaving no space to distribute. By setting an explicit `width`, you create leftover horizontal space. `margin: auto` on the left and right tells the browser to split that remaining space equally — pushing the element to the center.

**The prerequisite:** A `width` less than 100% **must** be set on the inner element. Without it, there is no free space for auto margins to consume, and centering has no visible effect.

---

## Quick Comparison

| | Flexbox | `margin: auto` |
|---|---|---|
| Rule lives on | Parent (`#outer`) | Child (`#inner`) |
| Width on child required | No | Yes |
| Also does vertical centering | Yes (`align-items: center`) | No |
| Browser support | All modern browsers | All browsers (IE 6+) |

**Recommendation:** Use Flexbox for new projects — it is less brittle, needs no magic width on the child, and easily extends to vertical centering by adding `align-items: center` to the parent.