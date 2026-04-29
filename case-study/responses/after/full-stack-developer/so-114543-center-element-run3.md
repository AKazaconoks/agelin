<!-- after / full-stack-developer / so-114543-center-element / run 3 -->

**Duration**: 36.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

## 1. Flexbox (modern, recommended)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` makes `#outer` a flex container and its children flex items. `justify-content: center` distributes the remaining horizontal space equally on both sides of `#inner`, placing it in the middle. The outer div's width is already 100% of its own container (it's block-level), so there's always free space to distribute.

**Gotcha:** `#inner` will shrink to fit its content by default. Add `flex: 1` or an explicit `width` if you want it to stretch.

---

## 2. `margin: 0 auto` (classic block-level)

```css
#inner {
    width: 50%;   /* or any explicit width, e.g. 300px or max-width */
    margin: 0 auto;
}
```

**Why it works:** In normal block flow, when a block element's `width` is less than its containing block, the remaining horizontal space can be split between `margin-left` and `margin-right`. Setting both to `auto` tells the browser to divide that space equally — centering the element.

**Gotcha:** An explicit `width` (or `max-width`) is **required**. Without it, a `<div>` defaults to `width: auto` (fills 100% of the parent), leaving zero space for the `auto` margins to split.

> Tip: `max-width` is often better than a fixed `width` for responsive layouts — it centers on wide viewports and fills the container on narrow ones.

---

## Quick Comparison

| | Flexbox | `margin: auto` |
|---|---|---|
| CSS goes on | Outer container | Inner element |
| Width required on inner? | No | Yes |
| Also vertical-centers easily? | Yes (`align-items: center`) | No |
| Works when you can't touch parent? | No | Yes |

**Default to flexbox** for new work. Use `margin: 0 auto` when you can't modify the parent's CSS or just need to constrain a single block's width.