<!-- after / bash-expert / so-38549-inner-vs-outer-join / run 3 -->

**Duration**: 27.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here's the breakdown from the agent:

---

## SQL JOIN Types: INNER vs OUTER

### Sample Tables

**employees**
```
id | name     | dept_id
---|----------|--------
1  | Alice    | 10
2  | Bob      | 20
3  | Charlie  | 10
4  | Diana    | 30     ← no matching department
```

**departments**
```
id | dept_name
---|----------
10 | Sales
20 | Marketing
40 | IT         ← no employees
```

---

### INNER JOIN
Returns only rows with a match in **both** tables.

```sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
```
```
name    | dept_name
--------|----------
Alice   | Sales
Bob     | Marketing
Charlie | Sales
-- Diana and IT both excluded (no match)
```

---

### LEFT OUTER JOIN
All rows from the **left** table; NULLs for unmatched right-side columns.

```sql
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;
```
```
name    | dept_name
--------|----------
Alice   | Sales
Bob     | Marketing
Charlie | Sales
Diana   | NULL      ← kept, no dept match
```

---

### RIGHT OUTER JOIN
All rows from the **right** table; NULLs for unmatched left-side columns.

```sql
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;
```
```
name    | dept_name
--------|----------
Alice   | Sales
Bob     | Marketing
Charlie | Sales
NULL    | IT        ← kept, no employee match
```

---

### FULL OUTER JOIN
All rows from **both** tables; NULLs wherever there's no match on either side.

```sql
SELECT e.name, d.dept_name
FROM employees e
FULL OUTER JOIN departments d ON e.dept_id = d.id;
```
```
name    | dept_name
--------|----------
Alice   | Sales
Bob     | Marketing
Charlie | Sales
Diana   | NULL      ← unmatched employee
NULL    | IT        ← unmatched department
```

---

### Quick Reference

| Join Type | Left unmatched | Right unmatched |
|-----------|---------------|----------------|
| INNER     | excluded      | excluded       |
| LEFT      | included (NULLs for right) | excluded |
| RIGHT     | excluded      | included (NULLs for left) |
| FULL      | included      | included       |

The choice depends on whether you need to preserve unmatched rows — and from which side.