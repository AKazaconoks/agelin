<!-- before / full-stack-developer / so-1789945-string-contains-substring / run 3 -->

**Duration**: 7.5s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
**Modern (ES6+)**

```js
'hello world'.includes('world'); // true
```

**Older approaches still seen in legacy code**

```js
// indexOf returns -1 if not found
'hello world'.indexOf('world') !== -1; // true

// Some used a bitwise trick (less readable)
~'hello world'.indexOf('world'); // truthy (-6), falsy (0) if not found

// Regex test
/world/.test('hello world'); // true
```

`String.prototype.includes()` is the modern, readable choice — available in all current browsers and Node.js since v6. Fall back to `indexOf` only if you need IE11 support or are working in a legacy codebase.