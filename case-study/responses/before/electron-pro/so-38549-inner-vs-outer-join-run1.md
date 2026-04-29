<!-- before / electron-pro / so-38549-inner-vs-outer-join / run 1 -->

**Duration**: 30.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here is the full breakdown from the agent:

---

## Sample Tables

**customers**

| customer_id | name    |
|-------------|---------|
| 1           | Alice   |
| 2           | Bob     |
| 3           | Charlie |

**orders**

| order_id | customer_id | item     |
|----------|-------------|----------|
| 101      | 1           | Laptop   |
| 102      | 1           | Mouse    |
| 103      | 2           | Monitor  |
| 104      | 99          | Keyboard |

Charlie (id=3) has no orders. Order 104 references customer 99, who does not exist. This setup makes the differences between join types very visible.

---

## INNER JOIN

Returns only rows with a match in **both** tables.

```sql
SELECT c.name, o.item
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | item    |
|-------|---------|
| Alice | Laptop  |
| Alice | Mouse   |
| Bob   | Monitor |

Charlie and Order 104 are both excluded — no match on either side.

---

## LEFT OUTER JOIN

Returns **all rows from the left table**, with NULLs for unmatched right-side columns.

```sql
SELECT c.name, o.item
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
```

| name    | item    |
|---------|---------|
| Alice   | Laptop  |
| Alice   | Mouse   |
| Bob     | Monitor |
| Charlie | NULL    |

Charlie now appears with NULL. Order 104 is still excluded.

---

## RIGHT OUTER JOIN

Returns **all rows from the right table**, with NULLs for unmatched left-side columns.

```sql
SELECT c.name, o.item
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | item     |
|-------|----------|
| Alice | Laptop   |
| Alice | Mouse    |
| Bob   | Monitor  |
| NULL  | Keyboard |

Order 104 now appears with NULL. Charlie is excluded.

---

## FULL OUTER JOIN

Returns **all rows from both tables**, NULLs wherever there is no match.

```sql
SELECT c.name, o.item
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
```

| name    | item     |
|---------|----------|
| Alice   | Laptop   |
| Alice   | Mouse    |
| Bob     | Monitor  |
| Charlie | NULL     |
| NULL    | Keyboard |

Both unmatched rows appear.

---

## Summary

| Join Type        | Left-only rows | Right-only rows | Matched rows |
|------------------|:--------------:|:---------------:|:------------:|
| INNER JOIN       | No             | No              | Yes          |
| LEFT OUTER JOIN  | Yes            | No              | Yes          |
| RIGHT OUTER JOIN | No             | Yes             | Yes          |
| FULL OUTER JOIN  | Yes            | Yes             | Yes          |

**Mental model:** picture two overlapping circles — INNER JOIN is only the center overlap; LEFT/RIGHT JOIN adds one circle fully; FULL OUTER JOIN gives you both circles entirely.

**Practical tip:** prefer LEFT JOIN over RIGHT JOIN for readability — any RIGHT JOIN can be rewritten as a LEFT JOIN by swapping the table order.