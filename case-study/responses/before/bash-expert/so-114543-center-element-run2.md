<!-- before / bash-expert / so-114543-center-element / run 2 -->

**Duration**: 34.9s
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

**Why it works:** `display: flex` turns the outer div into a flex container. `justify-content: center` distributes the remaining horizontal space equally on both sides of `#inner` along the main axis (which is horizontal by default). No width on `#inner` required.

---

## 2. `margin: 0 auto` (Classic block-level)

```css
#inner {
    width: 200px; /* must be explicit */
    margin: 0 auto;
}
```

**Why it works:** For a block-level element, when left and right margins are both `auto`, the browser splits the remaining space (parent width minus element width) equally between them, pushing the element to the center. The explicit `width` is required — if the element is `width: 100%` (the default block behavior), there's no remaining space to distribute, so centering has no effect.

---

## When to use which

| | Flexbox | `margin: auto` |
|---|---|---|
| Requires width on inner? | No | Yes |
| Works with dynamic/unknown widths? | Yes | No |
| Browser support | All modern browsers | All browsers including old IE |

**Default to flexbox** for new work. Use `margin: 0 auto` when you have a fixed-width element and want centering without touching the parent's display mode.