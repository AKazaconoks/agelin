<!-- after / bash-expert / so-114543-center-element / run 3 -->

**Duration**: 22.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the canonical approaches:

---

## 1. Flexbox (modern, preferred)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` makes `#outer` a flex container. Its direct children become flex items laid out along the horizontal main axis. `justify-content: center` places those items at the center of that axis — no width required on the inner element.

---

## 2. `margin: 0 auto` (classic block-level)

```css
#inner {
    width: 200px; /* a definite width is required */
    margin: 0 auto;
}
```

**Why it works:** A block element normally stretches to fill its parent's width. When you give it an explicit width, leftover horizontal space exists. Setting both `margin-left` and `margin-right` to `auto` tells the browser to split that leftover space equally on both sides, which centers the box.

**Constraint:** The inner element must have a declared width (fixed or percentage) — `auto` margins on a full-width block have no room to act.

---

## 3. CSS Grid (bonus modern option)

```css
#outer {
    display: grid;
    justify-items: center; /* horizontal only */
}
```

Works the same conceptual way as flexbox. Use `place-items: center` if you also want vertical centering.

---

**Quick guidance:**
- New code → **flexbox** (no width needed, clean intent).
- Need widest possible compatibility or are already in a block-layout context → **`margin: 0 auto`** with an explicit width.