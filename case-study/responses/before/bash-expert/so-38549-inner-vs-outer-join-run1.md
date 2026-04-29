<!-- before / bash-expert / so-38549-inner-vs-outer-join / run 1 -->

**Duration**: 25.4s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here's a complete breakdown of SQL join types, courtesy of the agent:

---

## Sample Tables

**`employees`**
```
emp_id | name     | dept_id
-------|----------|--------
1      | Alice    | 10
2      | Bob      | 20
3      | Charlie  | 10
4      | Diana    | 30   ← no matching dept
```

**`departments`**
```
dept_id | dept_name
--------|----------
10      | Sales
20      | Marketing
40      | Finance  ← no matching employees
```

---

## INNER JOIN

Returns only rows with a match **in both** tables.

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
Diana and Finance are both excluded — no match on either side.

---

## LEFT OUTER JOIN

Returns **all rows from the left table**, with NULLs where no match exists in the right.

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
Diana   | NULL      ← kept, no dept match
```

---

## RIGHT OUTER JOIN

Returns **all rows from the right table**, with NULLs where no match exists in the left.

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
NULL    | Finance   ← kept, no employee match
```

---

## FULL OUTER JOIN

Returns **all rows from both tables**, with NULLs on whichever side has no match.

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
NULL    | Finance
```

---

## Summary

| Join Type | Left unmatched | Right unmatched |
|-----------|:--------------:|:---------------:|
| INNER     | excluded       | excluded        |
| LEFT      | included (NULL)| excluded        |
| RIGHT     | excluded       | included (NULL) |
| FULL      | included (NULL)| included (NULL) |

The keyword `OUTER` is optional — `LEFT JOIN` and `LEFT OUTER JOIN` are identical in all major SQL databases.