<!-- before / bash-expert / so-114543-center-element / run 3 -->

**Duration**: 30.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the canonical approaches:

---

## 1. Flexbox (Modern — Recommended)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` makes `#outer` a flex container. Its children become flex items arranged along the horizontal main axis. `justify-content: center` places them at the center of that axis with equal space on both sides. No width on `#inner` required.

---

## 2. `margin: 0 auto` (Classic — Block-level)

```css
#inner {
    width: 300px;      /* required — a specific or percentage width */
    margin: 0 auto;    /* shorthand for: margin-left: auto; margin-right: auto */
}
```

**Why it works:** Block-level elements expand to fill their container by default. When you give `#inner` a fixed width that's narrower than `#outer`, leftover horizontal space exists. Setting both horizontal margins to `auto` tells the browser to split that leftover space equally — which centers the element.

**Requirement:** `#inner` must have an explicit `width` (or `max-width`). Without one, it fills 100% of the container and there's nothing to center.

---

## Quick Comparison

| | Flexbox | margin auto |
|---|---|---|
| Needs width on inner? | No | Yes |
| Requires changing outer? | Yes (`display: flex`) | No |
| Also handles vertical centering? | Yes (`align-items: center`) | No |
| Browser support | IE11+, all modern | All browsers |

**Bottom line:** Use **flexbox** for new work — it's cleaner and more flexible. Use `margin: 0 auto` when you need legacy browser support or are centering a single block that already has a defined width.