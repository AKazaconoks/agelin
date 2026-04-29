<!-- after / electron-pro / so-38549-inner-vs-outer-join / run 2 -->

**Duration**: 27.4s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here's the full breakdown from the agent:

---

## Sample Tables

**employees**
| emp_id | name  | dept_id |
|--------|-------|---------|
| 1      | Alice | 10      |
| 2      | Bob   | 20      |
| 3      | Carol | 30      |
| 4      | Dave  | NULL    |

**departments**
| dept_id | dept_name   |
|---------|-------------|
| 10      | Engineering |
| 20      | Marketing   |
| 40      | HR          |

Intentional mismatches: Carol's dept `30` doesn't exist, Dave has no dept, and HR (`40`) has no employees.

---

## INNER JOIN

Returns only rows where the join condition matches in **both** tables. Non-matching rows are discarded.

```sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |

Carol, Dave, and HR are all dropped — no match, no row.

---

## LEFT OUTER JOIN

Returns **all rows from the left table**, with NULLs where there's no match on the right.

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
| Dave  | NULL        |

---

## RIGHT OUTER JOIN

The mirror of LEFT JOIN — **all rows from the right table**, NULLs where there's no match on the left.

```sql
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.dept_id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |
| NULL  | HR          |

> In practice, RIGHT JOIN is rarely used. You can always rewrite it as a LEFT JOIN by swapping the table order.

---

## FULL OUTER JOIN

Returns **all rows from both tables**. NULLs fill in wherever there's no match on either side.

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
| Dave  | NULL        |
| NULL  | HR          |

> MySQL doesn't support `FULL OUTER JOIN` natively — emulate it with `LEFT JOIN UNION ALL RIGHT JOIN WHERE left_key IS NULL`.

---

## Decision Cheat Sheet

| Goal | Join type |
|---|---|
| Only matched records | INNER JOIN |
| All from left, matched from right | LEFT JOIN |
| All from right, matched from left | RIGHT JOIN |
| Everything from both sides | FULL OUTER JOIN |
| Rows in left with **no** match in right | LEFT JOIN + `WHERE right_key IS NULL` |
| Rows in either side with **no** match | FULL OUTER JOIN + `WHERE either_key IS NULL` |

**Mental model:** INNER JOIN = intersection, FULL OUTER JOIN = union, LEFT/RIGHT JOINs = asymmetric unions that privilege one side.