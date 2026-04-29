<!-- after / full-stack-developer / so-38549-inner-vs-outer-join / run 1 -->

**Duration**: 127.3s
**Strict pass**: false
**Timed out**: true
**Failure reason**: duration budget exceeded: 127.26s > 60s

---
Here's a thorough breakdown from the agent:

---

## SQL JOIN Types Explained

The core difference: **INNER JOIN** returns only rows with a match in **both** tables. **OUTER JOINs** return matched rows **plus** unmatched rows from one or both tables, filling gaps with `NULL`.

---

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

Deliberate mismatches: Carol's dept 30 doesn't exist, Dave has no dept, and HR (40) has no employees.

---

### INNER JOIN

Returns only rows where the join condition is satisfied in **both** tables.

```sql
SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
```

| name  | dept_name   |
|-------|-------------|
| Alice | Engineering |
| Bob   | Marketing   |

Carol, Dave, and HR are all dropped.

---

### LEFT OUTER JOIN

Returns **all rows from the left table**, plus matched rows from the right. No right-side match → `NULL`.

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

### RIGHT OUTER JOIN

Mirror of LEFT JOIN. Returns **all rows from the right table**, plus matched rows from the left.

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

> In practice, RIGHT JOIN is rarely used — most developers rewrite it as a LEFT JOIN by swapping table order.

---

### FULL OUTER JOIN

Returns **all rows from both tables**. Unmatched rows from either side get `NULL` for the other side's columns.

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

> **MySQL note:** MySQL doesn't support `FULL OUTER JOIN` natively — use `LEFT JOIN UNION ALL RIGHT JOIN WHERE left_key IS NULL` as a workaround.

---

### Summary

| Join Type        | Left unmatched | Right unmatched | Matched rows |
|------------------|----------------|-----------------|--------------|
| INNER JOIN       | Excluded       | Excluded        | Included     |
| LEFT OUTER JOIN  | Included (NULL)| Excluded        | Included     |
| RIGHT OUTER JOIN | Excluded       | Included (NULL) | Included     |
| FULL OUTER JOIN  | Included (NULL)| Included (NULL) | Included     |

**When to use each:**
- **INNER JOIN** — you only want complete, matched data (the common case).
- **LEFT JOIN** — the left table is your primary subject, right-side data is optional.
- **RIGHT JOIN** — rarely; prefer rewriting as a LEFT JOIN.
- **FULL OUTER JOIN** — auditing or syncing two datasets to find everything missing on either side.