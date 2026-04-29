<!-- after / bash-expert / so-38549-inner-vs-outer-join / run 1 -->

**Duration**: 25.4s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here's the breakdown from the agent:

---

## Sample Tables

**employees**
```
emp_id | name    | dept_id
-------|---------|--------
1      | Alice   | 10
2      | Bob     | 20
3      | Charlie | 10
4      | Diana   | NULL
```

**departments**
```
dept_id | dept_name
--------|----------
10      | Sales
20      | Marketing
30      | HR
```

---

## INNER JOIN

Returns only rows with a match in **both** tables.

```sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
```

```
Alice   | Sales
Bob     | Marketing
Charlie | Sales
```

Diana (no dept) and HR (no employees) are both excluded.

---

## LEFT JOIN

All rows from the **left** table; NULLs where no right-side match exists.

```sql
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id;
```

```
Alice   | Sales
Bob     | Marketing
Charlie | Sales
Diana   | NULL       ← kept, no matching dept
```

---

## RIGHT JOIN

All rows from the **right** table; NULLs where no left-side match exists.

```sql
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.dept_id;
```

```
Alice   | Sales
Bob     | Marketing
Charlie | Sales
NULL    | HR         ← kept, no matching employee
```

---

## FULL OUTER JOIN

All rows from **both** tables regardless of matches.

```sql
SELECT e.name, d.dept_name
FROM employees e
FULL OUTER JOIN departments d ON e.dept_id = d.dept_id;
```

```
Alice   | Sales
Bob     | Marketing
Charlie | Sales
Diana   | NULL       ← unmatched employee
NULL    | HR         ← unmatched department
```

---

## Quick Reference

| Join Type | Left unmatched | Right unmatched |
|-----------|:--------------:|:---------------:|
| INNER     | excluded       | excluded        |
| LEFT      | included       | excluded        |
| RIGHT     | excluded       | included        |
| FULL      | included       | included        |

The rule of thumb: use INNER when you only care about rows that have data on both sides; use an OUTER variant when you need to preserve rows that have no counterpart in the other table.