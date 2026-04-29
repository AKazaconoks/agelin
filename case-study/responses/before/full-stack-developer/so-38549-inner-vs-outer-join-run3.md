<!-- before / full-stack-developer / so-38549-inner-vs-outer-join / run 3 -->

**Duration**: 29.3s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here is the full breakdown from the agent:

---

## Sample Data

**customers**
| customer_id | name |
|---|---|
| 1 | Alice |
| 2 | Bob |
| 3 | Carol |

**orders**
| order_id | customer_id | amount |
|---|---|---|
| 101 | 1 | 50.00 |
| 102 | 1 | 30.00 |
| 103 | 2 | 75.00 |
| 104 | 99 | 20.00 |

Carol (id=3) has no orders. Order 104 references a non-existent customer (id=99).

---

## INNER JOIN

Returns only rows where a match exists in **both** tables.

```sql
SELECT c.name, o.order_id, o.amount
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
```

| name | order_id | amount |
|---|---|---|
| Alice | 101 | 50.00 |
| Alice | 102 | 30.00 |
| Bob | 103 | 75.00 |

Carol and Order 104 are both excluded — no matching counterpart.

---

## LEFT OUTER JOIN

Returns **all rows from the left table**, with NULLs for unmatched right-side columns.

```sql
SELECT c.name, o.order_id, o.amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
```

| name | order_id | amount |
|---|---|---|
| Alice | 101 | 50.00 |
| Alice | 102 | 30.00 |
| Bob | 103 | 75.00 |
| Carol | NULL | NULL |

Carol appears with NULLs. Order 104 is still excluded.

---

## RIGHT OUTER JOIN

Returns **all rows from the right table**, with NULLs for unmatched left-side columns.

```sql
SELECT c.name, o.order_id, o.amount
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
```

| name | order_id | amount |
|---|---|---|
| Alice | 101 | 50.00 |
| Alice | 102 | 30.00 |
| Bob | 103 | 75.00 |
| NULL | 104 | 20.00 |

Order 104 now appears with a NULL name. Carol is excluded.

---

## FULL OUTER JOIN

Returns **all rows from both tables**, with NULLs wherever there is no match.

```sql
SELECT c.name, o.order_id, o.amount
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
```

| name | order_id | amount |
|---|---|---|
| Alice | 101 | 50.00 |
| Alice | 102 | 30.00 |
| Bob | 103 | 75.00 |
| Carol | NULL | NULL |
| NULL | 104 | 20.00 |

Every row from both tables appears.

---

## Summary

| Join Type | Left-only rows | Right-only rows | Matched rows |
|---|---|---|---|
| INNER JOIN | No | No | Yes |
| LEFT OUTER JOIN | Yes | No | Yes |
| RIGHT OUTER JOIN | No | Yes | Yes |
| FULL OUTER JOIN | Yes | Yes | Yes |

**Mental model:** Think of a Venn diagram — INNER is just the overlap, LEFT/RIGHT includes the full respective circle, and FULL covers the entire combined area.

One practical note: a RIGHT JOIN can always be rewritten as a LEFT JOIN by swapping the table order, which is why most developers stick to LEFT JOIN for consistency.