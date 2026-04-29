<!-- after / full-stack-developer / so-114543-center-element / run 1 -->

**Duration**: 27.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## Horizontally Centering a `<div>` in CSS

---

### Approach 1: Flexbox on the outer container (modern)

```css
#outer {
  display: flex;
  justify-content: center;
}
```

**Why it works:** `display: flex` puts `#outer` into a flex formatting context, making its direct children flex items. `justify-content` controls alignment along the **main axis** (horizontal by default). The value `center` distributes the remaining space equally on both sides of `#inner` — no properties needed on the inner element itself.

**When to use it:** The default choice for modern layouts. Add `align-items: center` to also center vertically with no extra work.

---

### Approach 2: `margin: 0 auto` on the inner element (classic)

```css
#inner {
  width: 50%; /* any explicit width shorter than the container */
  margin: 0 auto;
}
```

**Why it works:** Block-level elements normally stretch to fill their container, leaving no space to redistribute. Once you give `#inner` an explicit width, the remaining horizontal space can be split between the left and right margins. Setting both to `auto` tells the browser to make them equal — which places the element dead center. (`0` handles top/bottom; only the left/right `auto` values drive centering.)

**When to use it:** Still the cleanest pattern for a fixed-width content block, e.g. `max-width: 1200px; margin: 0 auto` for a page wrapper. Does **not** help with vertical centering.

---

### Quick comparison

|  | Flexbox | `margin: auto` |
|---|---|---|
| Property set on | Outer (`#outer`) | Inner (`#inner`) |
| Explicit width required | No | Yes |
| Vertical centering | Yes (`align-items`) | No |
| Browser support | All modern browsers | Universal |

**Bottom line:** Use **flexbox** when you need expressive control or the inner element has no fixed width. Use **`margin: 0 auto`** when centering a single fixed-width block — it remains the most self-documenting solution for that pattern.