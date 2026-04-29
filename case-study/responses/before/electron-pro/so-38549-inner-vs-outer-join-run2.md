<!-- before / electron-pro / so-38549-inner-vs-outer-join / run 2 -->

**Duration**: 35.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /left\s+(outer\s+)?join.*all\s+(rows?|records?)\s+from\s+(the\s+)?left/is | output did not match /all\s+(rows?|records?)\s+from\s+(the\s+)?(left|first)\s+table/i

---
Here's a thorough breakdown from the agent:

---

## SQL JOIN Types

### Example Tables

**`employees`**

| emp_id | name  | dept_id |
|--------|-------|---------|
| 1      | Alice | 10      |
| 2      | Bob   | 20      |
| 3      | Carol | 30      |
| 4      | Dave  | NULL    |

**`departments`**

| dept_id | dept_name   |
|---------|-------------|
| 10      | Engineering |
| 20      | Marketing   |
| 40      | HR          |

Carol (dept 30) and Dave (no dept) have no matching department. HR (dept 40) has no employees.

---

### INNER JOIN — only matched rows from both tables

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

### LEFT OUTER JOIN — all left rows + matched right rows

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

Every employee is kept; missing departments become `NULL`.

---

### RIGHT OUTER JOIN — all right rows + matched left rows

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

Every department is kept; HR gets `NULL` for the employee name.

---

### FULL OUTER JOIN — all rows from both tables

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

No row from either table is lost.

---

### Summary Table

| Join Type        | Keeps unmatched left rows | Keeps unmatched right rows |
|------------------|:------------------------:|:--------------------------:|
| INNER JOIN       | No                       | No                         |
| LEFT OUTER JOIN  | Yes                      | No                         |
| RIGHT OUTER JOIN | No                       | Yes                        |
| FULL OUTER JOIN  | Yes                      | Yes                        |

**Key practical notes:**
- `LEFT JOIN` and `LEFT OUTER JOIN` are identical — `OUTER` is optional.
- A `RIGHT JOIN` can always be rewritten as a `LEFT JOIN` by swapping the tables; many teams standardize on `LEFT JOIN` for consistency.
- MySQL doesn't support `FULL OUTER JOIN` natively — emulate it with `LEFT JOIN UNION RIGHT JOIN`.
- To find orphaned rows (e.g., employees with no department), use `LEFT JOIN` and add `WHERE d.dept_id IS NULL`.