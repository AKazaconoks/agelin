<!-- before / bash-expert / so-38549-inner-vs-outer-join / run 3 -->

**Duration**: 30.2s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here's the full breakdown from the agent:

---

## Sample Tables

**employees**
```
emp_id | name     | dept_id
-------|----------|--------
1      | Alice    | 10
2      | Bob      | 20
3      | Charlie  | 10
4      | Diana    | 30
```

**departments**
```
dept_id | dept_name
--------|----------
10      | Sales
20      | Marketing
40      | IT
```

Note: Diana (dept 30) has no matching department; IT (dept 40) has no employees.

---

## INNER JOIN

Returns **only rows that match in both tables**.

```sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
```

```
name    | dept_name
--------|----------
Alice   | Sales
Bob     | Marketing
Charlie | Sales
```

Diana and IT are both excluded — no complete match.

---

## LEFT JOIN

Returns **all rows from the left table**, plus matches from the right. Non-matching right-side values become `NULL`.

```sql
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id;
```

```
name    | dept_name
--------|----------
Alice   | Sales
Bob     | Marketing
Charlie | Sales
Diana   | NULL       ← no matching dept, still included
```

---

## RIGHT JOIN

Returns **all rows from the right table**, plus matches from the left. Non-matching left-side values become `NULL`.

```sql
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.dept_id;
```

```
name    | dept_name
--------|----------
Alice   | Sales
Bob     | Marketing
Charlie | Sales
NULL    | IT         ← no employees, still included
```

---

## FULL OUTER JOIN

Returns **all rows from both tables**. Unmatched rows from either side get `NULL` for the other table's columns.

```sql
SELECT e.name, d.dept_name
FROM employees e
FULL OUTER JOIN departments d ON e.dept_id = d.dept_id;
```

```
name    | dept_name
--------|----------
Alice   | Sales
Bob     | Marketing
Charlie | Sales
Diana   | NULL
NULL    | IT
```

---

## Summary

| Join Type | What it returns |
|-----------|-----------------|
| `INNER JOIN` | Only rows with matches in **both** tables |
| `LEFT JOIN` | All from left + matches from right (NULLs for gaps) |
| `RIGHT JOIN` | All from right + matches from left (NULLs for gaps) |
| `FULL OUTER JOIN` | All rows from **both** tables (NULLs for gaps on either side) |

The core idea: outer joins let you preserve unmatched rows (with `NULL` fill-ins) rather than silently dropping them the way `INNER JOIN` does.