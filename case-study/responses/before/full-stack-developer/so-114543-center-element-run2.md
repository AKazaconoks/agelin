<!-- before / full-stack-developer / so-114543-center-element / run 2 -->

**Duration**: 30.7s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here are the two canonical approaches:

---

## 1. `margin: 0 auto` (Classic block-level)

```css
#outer {
    width: 100%;
}

#inner {
    width: 50%; /* must be narrower than parent */
    margin: 0 auto;
}
```

**Why it works:** A block element with a fixed `width` and `margin: auto` on both sides causes the browser to distribute the remaining horizontal space equally left and right — mathematically centering it. Without an explicit `width`, `#inner` expands to 100% of its parent, leaving nothing to distribute, so `auto` has no effect.

The rule lives on the **child**.

---

## 2. Flexbox (Modern)

```css
#outer {
    display: flex;
    justify-content: center;
}
```

**Why it works:** `display: flex` on the parent establishes a flex formatting context. `justify-content: center` distributes free space equally on both sides of the flex item(s) along the main (horizontal) axis. No width required on `#inner` — it shrinks to fit its content automatically.

The rule lives on the **parent**.

---

## Quick comparison

| | `margin: 0 auto` | Flexbox |
|---|---|---|
| Width required on inner? | Yes, mandatory | No |
| Control lives on | Child | Parent |
| Centers vertically too? | No | Yes, add `align-items: center` |
| Multiple children? | One at a time | All simultaneously |

**Recommendation:** Use flexbox for new work. Use `margin: 0 auto` when you need simple centering of a single block with a known width and want zero dependencies on the parent's style.