<!-- before / full-stack-developer / so-38549-inner-vs-outer-join / run 2 -->

**Duration**: 29.2s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here is a complete breakdown of SQL join types:

---

## The Example Tables

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
| 103      | 2           | Keyboard |
| 104      | 99          | Monitor  |

Alice has 2 orders, Bob has 1, Charlie has none. Order 104 references a non-existent customer (99).

---

## INNER JOIN

Returns only rows where both sides have a match. Non-matching rows are dropped entirely.

```sql
SELECT c.name, o.item
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | item     |
|-------|----------|
| Alice | Laptop   |
| Alice | Mouse    |
| Bob   | Keyboard |

Charlie (no orders) and order 104 (no customer) are both excluded.

---

## LEFT OUTER JOIN

Returns all rows from the **left** table. Unmatched right-side columns become `NULL`.

```sql
SELECT c.name, o.item
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
```

| name    | item     |
|---------|----------|
| Alice   | Laptop   |
| Alice   | Mouse    |
| Bob     | Keyboard |
| Charlie | NULL     |

Charlie now appears with `NULL` for item. The orphan order 104 is still excluded.

---

## RIGHT OUTER JOIN

Mirror of LEFT JOIN — returns all rows from the **right** table. Unmatched left-side columns become `NULL`.

```sql
SELECT c.name, o.item
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | item     |
|-------|----------|
| Alice | Laptop   |
| Alice | Mouse    |
| Bob   | Keyboard |
| NULL  | Monitor  |

Order 104 (Monitor) now appears with `NULL` for name. Charlie is excluded.

---

## FULL OUTER JOIN

Returns all rows from **both** tables. Unmatched rows on either side get `NULL` for the missing columns.

```sql
SELECT c.name, o.item
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
```

| name    | item     |
|---------|----------|
| Alice   | Laptop   |
| Alice   | Mouse    |
| Bob     | Keyboard |
| Charlie | NULL     |
| NULL    | Monitor  |

No row is ever dropped — both Charlie and the orphan order appear.

---

## Summary

| Join Type        | Unmatched Left  | Unmatched Right |
|------------------|-----------------|-----------------|
| INNER JOIN       | Excluded        | Excluded        |
| LEFT OUTER JOIN  | Included (NULL) | Excluded        |
| RIGHT OUTER JOIN | Excluded        | Included (NULL) |
| FULL OUTER JOIN  | Included (NULL) | Included (NULL) |

**Mental model:** Think Venn diagrams — INNER is the intersection, LEFT/RIGHT are one full circle plus the intersection, FULL is both circles entirely.

One practical note: a `RIGHT JOIN` can always be rewritten as a `LEFT JOIN` by swapping the table order, so most teams standardize on `LEFT JOIN` for consistency.