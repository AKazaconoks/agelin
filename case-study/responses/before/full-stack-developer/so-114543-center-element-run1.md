<!-- before / full-stack-developer / so-114543-center-element / run 1 -->

**Duration**: 37.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the canonical approaches:

---

## 1. Flexbox (Modern)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` creates a flex formatting context. Its children become flex items, and `justify-content` controls alignment along the main axis (horizontal by default). Setting it to `center` splits leftover horizontal space equally on both sides of the item. `#inner` needs no properties at all — centering is entirely driven by the parent and works regardless of the inner element's width.

---

## 2. `margin: 0 auto` (Classic Block)

```css
#inner {
    width: 50%;   /* explicit width is REQUIRED */
    margin: 0 auto;
}
```

**Why it works:** When both `margin-left` and `margin-right` are `auto`, the browser divides the remaining horizontal space equally between them, pushing the element to center. The `0` handles top/bottom (vertical `auto` margins don't do the same thing).

**The width requirement is critical:** A `<div>` is block-level and stretches to 100% of its container by default. With no leftover space, the auto margins have nothing to distribute. You must give `#inner` an explicit `width` (or `max-width`) narrower than `#outer` to create the space the margins can act on. `max-width` is often preferred for responsive layouts.

---

## Honorable Mention: Grid

```css
#outer {
    display: grid;
    justify-items: center;
}
```

Same axis-alignment concept as Flexbox. Valid, but Flexbox is more idiomatic for this single-axis case.

---

### Quick Reference

| Approach | Centering declared on | Width required on inner? |
|---|---|---|
| Flexbox | Parent | No |
| `margin: auto` | Child | Yes (explicit) |
| Grid | Parent | No |

**Recommendation:** Default to Flexbox for new code — explicit, width-agnostic, and readable. The `margin: auto` technique is still useful when you want the child to own its own centering (e.g., a centered page-width content wrapper).