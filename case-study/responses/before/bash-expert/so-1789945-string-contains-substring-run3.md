<!-- before / bash-expert / so-1789945-string-contains-substring / run 3 -->

**Duration**: 23.1s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
## JavaScript String Contains Check

### Modern (ES2015+) — use this

```javascript
"Hello, world!".includes("world");        // true
"Hello, world!".includes("universe");     // false
"Hello, world!".includes("world", 8);     // false (start search at index 8)
```

`String.prototype.includes()` is purpose-built, readable, and the idiomatic choice.

---

### Legacy — what you'll see in older code

**`indexOf()` — most common legacy pattern:**
```javascript
str.indexOf("world") !== -1   // true if found
str.indexOf("world") >= 0     // equivalent alternative
```

**Regex `test()` — still useful for pattern matching:**
```javascript
/world/.test(str)             // true
```

**`search()` / `match()` — more verbose, rarely needed for plain substrings:**
```javascript
str.search("world") !== -1
str.match("world") !== null
```

---

**Quick rule of thumb:** all approaches are case-sensitive by default. For case-insensitive checks, normalize first:

```javascript
str.toLowerCase().includes("world")
```