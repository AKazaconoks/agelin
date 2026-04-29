<!-- after / bash-expert / so-114543-center-element / run 2 -->

**Duration**: 22.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

## 1. Modern — Flexbox (recommended)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** Setting `display: flex` makes the outer div a flex container. `justify-content: center` then distributes flex children along the **main axis** (horizontal by default), placing equal space on both sides of each child — centering `#inner` automatically.

No width required on the inner element.

---

## 2. Classic — `margin: 0 auto`

```css
#inner {
    width: 200px; /* must be explicit */
    margin: 0 auto;
}
```

**Why it works:** For a block-level element, `margin: auto` on the left and right sides tells the browser to compute equal margins to fill the remaining horizontal space in the parent. The equal margins push the element to the center.

**Critical requirement:** `#inner` must have an explicit `width`. Without it, a block element stretches to fill its parent — there's no remaining space for margins to divide, so centering has no effect.

---

**Quick comparison:**

| | Flexbox | `margin: auto` |
|---|---|---|
| Set on | Outer container | Inner element |
| Needs explicit width? | No | Yes |
| Browser support | All modern browsers | All browsers |

Flexbox is the go-to approach today. `margin: 0 auto` remains useful when you specifically want to center a fixed-width block element without touching the parent's CSS.