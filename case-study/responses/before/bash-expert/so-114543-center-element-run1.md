<!-- before / bash-expert / so-114543-center-element / run 1 -->

**Duration**: 36.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

## 1. Flexbox (modern)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` turns `#outer` into a flex container, making `#inner` a flex item. `justify-content: center` distributes items along the main axis (horizontal by default) by splitting the remaining space equally on both sides. No width on the inner element is required.

---

## 2. `margin: 0 auto` (block-level)

```css
#inner {
    width: 300px; /* must be a specific value */
    margin: 0 auto;
}
```

**Why it works:** When a block-level element has a defined width less than its container, the browser computes the leftover horizontal space. Setting both left and right margins to `auto` tells the browser to split that leftover space equally — pushing the element to the center. Without an explicit width, the element expands to fill the container and there is no leftover space to distribute.

---

## Key differences

| | Flexbox | `margin: auto` |
|---|---|---|
| Width on inner required? | No | Yes |
| Applied to | Outer container | Inner element |
| Browser support | IE 11+ (with prefix for IE10) | IE 8+ |
| Responsive friendliness | Higher | Lower |

**Prefer flexbox** for new code. Use `margin: 0 auto` when you have a fixed-width element or need to support very old browsers.