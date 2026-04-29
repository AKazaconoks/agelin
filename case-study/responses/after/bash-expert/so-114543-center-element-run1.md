<!-- after / bash-expert / so-114543-center-element / run 1 -->

**Duration**: 25.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the canonical ways to horizontally center a `<div>` inside another `<div>`:

---

## 1. Flexbox (modern, recommended)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` makes `#outer` a flex container. Its direct children become flex items laid out along the main axis (horizontal by default). `justify-content: center` tells the browser to pack those items at the center of that axis, leaving equal free space on each side.

---

## 2. `margin: 0 auto` (classic block-level)

```css
#inner {
    width: 200px; /* must have an explicit width */
    margin: 0 auto;
}
```

**Why it works:** Block-level elements stretch to fill their container by default. When you give one a fixed `width`, there's leftover horizontal space. Setting `margin-left: auto` and `margin-right: auto` tells the browser to split that leftover space equally between the two sides — which centers the element. This relies on the element being `display: block` (the default for `<div>`).

---

## Two bonus approaches worth knowing

**CSS Grid** — also modern, one-liner:
```css
#outer {
    display: grid;
    justify-items: center; /* horizontal only */
}
```

**`transform` trick** — useful when the inner width is unknown:
```css
#inner {
    position: relative;
    left: 50%;
    transform: translateX(-50%);
}
```
`left: 50%` moves the element's *left edge* to the midpoint of the container; `translateX(-50%)` shifts it back by half *its own width*, landing it perfectly centered.

---

### Which to use?

| Situation | Recommendation |
|---|---|
| New project, no IE concerns | **Flexbox** or Grid |
| Need to support old browsers | **`margin: 0 auto`** |
| Unknown inner width, positioned context | **transform trick** |