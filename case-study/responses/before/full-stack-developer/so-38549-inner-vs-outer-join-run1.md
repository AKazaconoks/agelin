<!-- before / full-stack-developer / so-38549-inner-vs-outer-join / run 1 -->

**Duration**: 43.8s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here is a complete breakdown of SQL join types:

---

## Sample Tables

**customers**

| customer_id | name  |
|-------------|-------|
| 1           | Alice |
| 2           | Bob   |
| 3           | Carol |

**orders**

| order_id | customer_id | product  |
|----------|-------------|----------|
| 101      | 1           | Laptop   |
| 102      | 1           | Mouse    |
| 103      | 2           | Keyboard |
| 104      | 99          | Monitor  |

Carol (id=3) has no orders. Order 104 references a non-existent customer (id=99).

---

## INNER JOIN

Returns only rows with a match in **both** tables.

```sql
SELECT c.name, o.order_id, o.product
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | order_id | product  |
|-------|----------|----------|
| Alice | 101      | Laptop   |
| Alice | 102      | Mouse    |
| Bob   | 103      | Keyboard |

Carol and Order 104 are both excluded — no match, no row.

---

## LEFT OUTER JOIN

Returns **all rows from the left table**; unmatched right-side rows become `NULL`.

```sql
SELECT c.name, o.order_id, o.product
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | order_id | product  |
|-------|----------|----------|
| Alice | 101      | Laptop   |
| Alice | 102      | Mouse    |
| Bob   | 103      | Keyboard |
| Carol | NULL     | NULL     |

Carol appears with `NULL`s. Order 104 is still excluded (orphan is on the right side).

**Use when:** "Give me all customers, and their orders if they have any."

---

## RIGHT OUTER JOIN

The mirror of LEFT JOIN — **all rows from the right table**; unmatched left-side rows become `NULL`.

```sql
SELECT c.name, o.order_id, o.product
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | order_id | product  |
|-------|----------|----------|
| Alice | 101      | Laptop   |
| Alice | 102      | Mouse    |
| Bob   | 103      | Keyboard |
| NULL  | 104      | Monitor  |

Order 104 now appears with a `NULL` customer name. Carol disappears.

> In practice, RIGHT JOIN is rarely used. You can always rewrite it as a LEFT JOIN by swapping the table order.

---

## FULL OUTER JOIN

Returns **all rows from both tables**. `NULL` fills in whichever side has no match.

```sql
SELECT c.name, o.order_id, o.product
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | order_id | product  |
|-------|----------|----------|
| Alice | 101      | Laptop   |
| Alice | 102      | Mouse    |
| Bob   | 103      | Keyboard |
| Carol | NULL     | NULL     |
| NULL  | 104      | Monitor  |

Both Carol and Order 104 appear. Nothing is lost.

**Use when:** auditing, data reconciliation, or finding gaps on either side.

> MySQL does not support `FULL OUTER JOIN` natively — use `LEFT JOIN UNION RIGHT JOIN` as a workaround.

---

## Quick Reference

| Join Type        | Left unmatched | Matched rows | Right unmatched |
|------------------|:--------------:|:------------:|:---------------:|
| INNER JOIN       | No             | Yes          | No              |
| LEFT JOIN        | Yes            | Yes          | No              |
| RIGHT JOIN       | No             | Yes          | Yes             |
| FULL OUTER JOIN  | Yes            | Yes          | Yes             |

**Decision rule:** Use INNER for "must exist in both", LEFT for "left table is primary", FULL OUTER for auditing everything across both tables.