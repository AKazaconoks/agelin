<!-- before / bash-expert / so-1789945-string-contains-substring / run 1 -->

**Duration**: 27.6s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## JavaScript String Contains Check

### Modern (ES6+) — use `includes()`

```javascript
const text = "Hello, world!";

text.includes("world");      // true
text.includes("universe");   // false

// Case-insensitive:
text.toLowerCase().includes("world");  // true
```

`String.prototype.includes()` is exactly the method you expected — it just arrived in ES2015.

---

### Legacy approaches (still common in older code)

**`indexOf()` — most common legacy pattern:**
```javascript
text.indexOf("world") !== -1;  // true
```

**`search()` — like indexOf but accepts regex:**
```javascript
text.search(/wor\w+/) !== -1;  // true
```

**`match()` — returns array or null:**
```javascript
text.match("world") !== null;  // true
!!text.match(/wor\w+/);        // true
```

---

**Rule of thumb:** Use `includes()` for all new code. You'll encounter `indexOf() !== -1` most frequently in legacy codebases since it predates ES2015. `search()`/`match()` are mainly worth reaching for when you need regex matching.