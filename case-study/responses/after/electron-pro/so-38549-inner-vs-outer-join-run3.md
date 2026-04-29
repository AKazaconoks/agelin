<!-- after / electron-pro / so-38549-inner-vs-outer-join / run 3 -->

**Duration**: 33.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here is the full breakdown:

---

### The Two Tables

**employees**
| emp_id | name  | dept_id |
|--------|-------|---------|
| 1      | Alice | 10      |
| 2      | Bob   | 20      |
| 3      | Carol | NULL    |

**departments**
| dept_id | dept_name   |
|---------|-------------|
| 10      | Engineering |
| 20      | Marketing   |
| 30      | Finance     |

Carol has no department. Finance has no employees. These gaps are what distinguish each join type.

---

### INNER JOIN

Returns only rows with a match **in both tables**.

```sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |

Carol and Finance are both excluded — no intersection, no row.

---

### LEFT (OUTER) JOIN

Returns **all rows from the left table**, with NULLs for unmatched right-side columns.

```sql
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |
| Carol | NULL        |

Carol appears; Finance does not (right table doesn't drive).

---

### RIGHT (OUTER) JOIN

Returns **all rows from the right table**, with NULLs for unmatched left-side columns.

```sql
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.dept_id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |
| NULL  | Finance     |

Finance appears; Carol does not. This is the mirror of LEFT JOIN — you can always rewrite one as the other by swapping table order.

---

### FULL (OUTER) JOIN

Returns **all rows from both tables**, NULLs filling gaps on either side.

```sql
SELECT e.name, d.dept_name
FROM employees e
FULL OUTER JOIN departments d ON e.dept_id = d.dept_id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |
| Carol | NULL        |
| NULL  | Finance     |

Nothing is dropped. Useful for auditing data integrity — surfacing orphans on either side.

---

### Summary

```
INNER JOIN  →  Intersection only (matched rows)
LEFT JOIN   →  All left  + matched right  (unmatched right = NULL)
RIGHT JOIN  →  All right + matched left   (unmatched left  = NULL)
FULL JOIN   →  Everything from both sides (NULLs fill the gaps)
```

**Practical rules:**
- Use **INNER JOIN** when a match is required for the row to be meaningful.
- Use **LEFT JOIN** when the left table is your primary entity and the right is optional context.
- **RIGHT JOIN** is rarely needed — swap table order and use LEFT JOIN for clarity.
- Use **FULL JOIN** for data reconciliation where neither source is authoritative.