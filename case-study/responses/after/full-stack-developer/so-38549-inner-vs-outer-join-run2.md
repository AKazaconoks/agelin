<!-- after / full-stack-developer / so-38549-inner-vs-outer-join / run 2 -->

**Duration**: 38.6s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here's a complete breakdown of SQL join types:

---

## Sample Data

**customers**

| customer_id | name  |
|-------------|-------|
| 1           | Alice |
| 2           | Bob   |
| 3           | Carol |

**orders**

| order_id | customer_id | item     |
|----------|-------------|----------|
| 101      | 1           | Laptop   |
| 102      | 1           | Mouse    |
| 103      | 2           | Keyboard |
| 104      | 99          | Monitor  |

Two interesting edge cases: **Carol** has no orders, and **order 104** references a non-existent customer (id=99).

---

## INNER JOIN

Returns only rows with a **match in both tables**. Non-matching rows on either side are discarded.

```sql
SELECT c.name, o.order_id, o.item
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | order_id | item     |
|-------|----------|----------|
| Alice | 101      | Laptop   |
| Alice | 102      | Mouse    |
| Bob   | 103      | Keyboard |

Carol and order 104 are both dropped.

---

## LEFT OUTER JOIN

Returns **all rows from the left table**, plus matched rows from the right. Unmatched right-side columns are NULL.

```sql
SELECT c.name, o.order_id, o.item
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | order_id | item     |
|-------|----------|----------|
| Alice | 101      | Laptop   |
| Alice | 102      | Mouse    |
| Bob   | 103      | Keyboard |
| Carol | NULL     | NULL     |

Carol appears with NULLs. Order 104 is still dropped — the **left table drives the result**.

**Use case:** "Show all customers and their orders if any." Filter `WHERE o.order_id IS NULL` to find customers who have never ordered.

---

## RIGHT OUTER JOIN

The mirror image — returns **all rows from the right table**, plus matched rows from the left.

```sql
SELECT c.name, o.order_id, o.item
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | order_id | item     |
|-------|----------|----------|
| Alice | 101      | Laptop   |
| Alice | 102      | Mouse    |
| Bob   | 103      | Keyboard |
| NULL  | 104      | Monitor  |

Order 104 now appears with NULL for name. Carol is dropped.

**Note:** RIGHT JOIN is rarely used — swapping the table order and using LEFT JOIN produces the same result and is easier to read.

---

## FULL OUTER JOIN

Returns **all rows from both tables**. Missing sides become NULL. Nothing is discarded.

```sql
SELECT c.name, o.order_id, o.item
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | order_id | item     |
|-------|----------|----------|
| Alice | 101      | Laptop   |
| Alice | 102      | Mouse    |
| Bob   | 103      | Keyboard |
| Carol | NULL     | NULL     |
| NULL  | 104      | Monitor  |

**Use case:** Data reconciliation — "show everything from both sides and highlight anything that doesn't line up."

> MySQL doesn't support FULL OUTER JOIN natively; use a `UNION` of a LEFT JOIN and a RIGHT JOIN instead.

---

## Summary

| Join Type        | Left table rows | Right table rows |
|------------------|-----------------|------------------|
| INNER JOIN       | Matched only    | Matched only     |
| LEFT OUTER JOIN  | **All**         | Matched only     |
| RIGHT OUTER JOIN | Matched only    | **All**          |
| FULL OUTER JOIN  | **All**         | **All**          |

**Quick rule:** Need confirmed matches only → INNER. Starting from a "master" table → LEFT JOIN. Auditing for orphaned records on either side → FULL OUTER JOIN.