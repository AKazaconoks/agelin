<!-- after / electron-pro / so-114543-center-element / run 2 -->

**Duration**: 26.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the canonical approaches:

---

## Flexbox (modern, recommended)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` makes `#outer` a flex container. `justify-content: center` distributes children along the **main axis** (horizontal by default), centering `#inner` regardless of its width. No width needed on the child.

---

## `margin: auto` (classic)

```css
#inner {
    width: fit-content; /* or any explicit width, e.g. 200px */
    margin: 0 auto;
}
```

**Why it works:** A block-level element with a constrained width and `auto` left/right margins splits the remaining horizontal space equally on both sides. Without a width, the element stretches to fill the parent and there's no leftover space for `auto` to distribute.

---

## Grid (equally modern)

```css
#outer {
    display: grid;
    justify-items: center;
}
```

Same axis-alignment logic as flexbox.

---

## Summary

| Approach | Property on | Requires width on child? |
|---|---|---|
| Flexbox | Parent | No |
| `margin: auto` | Child | Yes |
| Grid | Parent | No |

**Use flexbox** for new code — it's the most expressive and requires no width on the child. **Use `margin: auto`** when you can only control the child's styles or need legacy browser support.