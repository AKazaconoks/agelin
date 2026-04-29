<!-- after / electron-pro / so-38549-inner-vs-outer-join / run 1 -->

**Duration**: 32.2s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the full breakdown:

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

Intentional mismatches: Carol's dept `30` doesn't exist, Dave has no dept, and HR has no employees.

---

## INNER JOIN

Returns **only rows where the condition matches in both tables**.

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

Returns **all rows from the left table**; unmatched right-side columns become `NULL`.

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

Every employee appears, even without a department.

---

## RIGHT OUTER JOIN

Mirror of LEFT JOIN — returns **all rows from the right table**; unmatched left-side columns become `NULL`.

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

Every department appears, even HR which has no employees. In practice, developers usually flip the table order and write a LEFT JOIN instead.

---

## FULL OUTER JOIN

Returns **all rows from both tables**; whichever side has no match gets `NULL` columns.

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

Nothing is dropped. Note: MySQL doesn't support `FULL OUTER JOIN` natively — emulate it with `LEFT JOIN UNION ALL RIGHT JOIN WHERE left_key IS NULL`.

---

## Decision Cheat Sheet

| Goal | Join Type |
|---|---|
| Only matched rows | INNER JOIN |
| All from left, matched from right | LEFT JOIN |
| All from right, matched from left | RIGHT JOIN |
| Everything from both sides | FULL OUTER JOIN |
| Find orphans (e.g. employees with no dept) | LEFT JOIN + `WHERE d.dept_id IS NULL` |