<!-- before / electron-pro / so-38549-inner-vs-outer-join / run 3 -->

**Duration**: 31.0s
**Strict pass**: true
**Timed out**: false
**Failure reason**: n/a

---
Here is the full breakdown from the agent:

---

## SQL JOIN Types Explained

A JOIN combines rows from two or more tables based on a related column. The core distinction is: an **INNER JOIN** returns only matching rows, while an **OUTER JOIN** also returns non-matching rows from one or both tables.

---

### Sample Tables

**`employees`**
| id | name  | dept_id |
|----|-------|---------|
| 1  | Alice | 10      |
| 2  | Bob   | 20      |
| 3  | Carol | 30      |

**`departments`**
| id | dept_name   |
|----|-------------|
| 10 | Engineering |
| 20 | Marketing   |
| 40 | HR          |

Key observations:
- Carol (`dept_id 30`) has **no matching department**.
- HR (`id 40`) has **no matching employee**.

---

### INNER JOIN

Returns only rows where the condition matches in **both** tables. Non-matching rows from either side are discarded.

```sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |

Carol and HR are both excluded.

---

### LEFT OUTER JOIN

Returns **all rows from the left table**, plus matched rows from the right. Unmatched right-side columns are `NULL`.

```sql
SELECT e.name, d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |
| Carol | NULL        |

Carol is preserved; HR is still excluded.

---

### RIGHT OUTER JOIN

The mirror of LEFT JOIN. Returns **all rows from the right table**, plus matched rows from the left. Unmatched left-side columns are `NULL`.

```sql
SELECT e.name, d.dept_name
FROM employees e
RIGHT JOIN departments d ON e.dept_id = d.id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |
| NULL  | HR          |

HR is preserved; Carol is excluded.

---

### FULL OUTER JOIN

Returns **all rows from both tables**. Where there is no match on either side, the missing columns are `NULL`.

```sql
SELECT e.name, d.dept_name
FROM employees e
FULL OUTER JOIN departments d ON e.dept_id = d.id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |
| Carol | NULL        |
| NULL  | HR          |

No row is lost from either table.

---

### Summary

| Join Type        | Matched rows | Unmatched LEFT rows | Unmatched RIGHT rows |
|------------------|:------------:|:-------------------:|:--------------------:|
| INNER JOIN       | Yes          | No                  | No                   |
| LEFT OUTER JOIN  | Yes          | Yes (NULLs)         | No                   |
| RIGHT OUTER JOIN | Yes          | No                  | Yes (NULLs)          |
| FULL OUTER JOIN  | Yes          | Yes (NULLs)         | Yes (NULLs)          |

**Rule of thumb:** Use INNER JOIN when you only care about data that exists on both sides. Use an OUTER JOIN when you need to preserve rows that may have no counterpart — then use `NULL` checks to identify those gaps.