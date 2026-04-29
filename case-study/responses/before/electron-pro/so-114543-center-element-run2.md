<!-- before / electron-pro / so-114543-center-element / run 2 -->

**Duration**: 40.9s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

## 1. Flexbox (modern, preferred)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**No width required on `#inner`.**

`display: flex` on the parent creates a flex formatting context. `justify-content` controls alignment along the **main axis**, which runs horizontally by default (`flex-direction: row`). Setting it to `center` distributes remaining free space equally on both sides of the child items. Centering is a property of the *container's* layout algorithm — the child's size is calculated from content first, then leftover space is distributed.

---

## 2. Classic `margin: 0 auto` (block flow)

```css
#inner {
    width: 50%; /* any explicit width less than the parent */
    margin: 0 auto;
}
```

**An explicit `width` is required.**

In normal block flow, when a block-level element has a fixed width smaller than its container, the browser must assign the remaining horizontal space somewhere. The spec says: if both `margin-left` and `margin-right` are `auto`, that remaining space is **split equally** between them — centering the element.

Without an explicit width, `#inner` stretches to fill 100% of `#outer` by default. There is zero free space to distribute, so `auto` margins resolve to `0` and nothing moves.

---

## Quick comparison

| Concern | Flexbox | `margin: auto` |
|---|---|---|
| Where centering is declared | On the **parent** | On the **child** |
| Width required on child | No | Yes |
| Centers multiple children | Yes, all at once | No, each needs its own rule |
| Browser support | All current browsers | All browsers incl. legacy |

For new projects, Flexbox is the go-to. The `margin: auto` approach remains useful when you cannot introduce a flex container, or need to center a single element with minimal CSS.