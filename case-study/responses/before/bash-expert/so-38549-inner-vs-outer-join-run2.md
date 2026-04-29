<!-- before / bash-expert / so-38549-inner-vs-outer-join / run 2 -->

**Duration**: 31.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here's the breakdown from the agent, using `employees` and `departments` tables:

---

## Sample Tables

**employees**
```
emp_id | name    | dept_id
-------|---------|--------
1      | Alice   | 10
2      | Bob     | 20
3      | Charlie | 10
4      | David   | NULL
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

David (NULL dept) and HR (no employees) are both excluded.

---

## LEFT OUTER JOIN

Returns **all rows from the left table**, with NULLs for unmatched right-table columns.

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
David   | NULL       ← no dept, still included
```

---

## RIGHT OUTER JOIN

Returns **all rows from the right table**, with NULLs for unmatched left-table columns.

```sql
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.dept_id;
```

```
name    | dept_name
--------|----------
Alice   | Sales
Charlie | Sales
Bob     | Marketing
NULL    | HR         ← no employees, still included
```

---

## FULL OUTER JOIN

Returns **all rows from both tables**, NULLs wherever there's no match on either side.

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
David   | NULL       ← no dept
NULL    | HR         ← no employees
```

---

## Quick Reference

| Join Type | Includes unmatched from left? | Includes unmatched from right? |
|-----------|-------------------------------|--------------------------------|
| INNER     | No                            | No                             |
| LEFT      | Yes                           | No                             |
| RIGHT     | No                            | Yes                            |
| FULL      | Yes                           | Yes                            |

**When to use which:**
- `INNER JOIN` — you only care about records that exist in both tables
- `LEFT JOIN` — you want all records from the primary (left) table, with optional data from the secondary
- `RIGHT JOIN` — same idea, but anchored to the right table (often rewritable as a LEFT JOIN by swapping table order)
- `FULL OUTER JOIN` — you want a complete picture of both tables, including all gaps