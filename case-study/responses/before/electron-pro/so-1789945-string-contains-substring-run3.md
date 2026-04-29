<!-- before / electron-pro / so-1789945-string-contains-substring / run 3 -->

**Duration**: 24.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
### Modern (ES6+)

`String.prototype.includes()` — returns a boolean directly:

```javascript
const str = "Hello, world!";

str.includes("world");       // true
str.includes("world", 8);   // false — optional start index
str.includes("missing");    // false
```

---

### Legacy approaches you'll see in older code

**`indexOf()` — the pre-ES6 workaround**

Returns the match index, or `-1` if absent. Requires an explicit comparison:

```javascript
str.indexOf("world") !== -1;   // true
str.indexOf("missing") !== -1; // false

// Common pitfall — avoid this shorthand:
!!str.indexOf("Hello");  // false, even though "Hello" IS there (index 0 is falsy!)
```

**`RegExp.test()`** — useful when you need case-insensitivity or patterns:

```javascript
/world/.test(str);        // true
/world/i.test("WORLD");   // true (case-insensitive)
```

---

### Quick reference

| Method | Returns | Use when |
|---|---|---|
| `includes()` | `boolean` | New code, plain substring |
| `indexOf() !== -1` | `number` | Legacy code or need position |
| `/pattern/.test()` | `boolean` | Regex / case-insensitive match |

**Default to `includes()`** for all new code. It's the closest to the `String.contains()` you'd expect from other languages.