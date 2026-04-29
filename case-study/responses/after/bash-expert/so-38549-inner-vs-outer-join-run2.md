<!-- after / bash-expert / so-38549-inner-vs-outer-join / run 2 -->

**Duration**: 35.0s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here's the breakdown from the agent:

---

## Example Tables

**customers**
```
customer_id | name
------------|--------
1           | Alice
2           | Bob
3           | Charlie
```

**orders**
```
order_id | customer_id | amount
---------|-------------|-------
101      | 1           | 50.00
102      | 1           | 25.00
103      | 2           | 75.00
104      | 4           | 100.00   ← customer_id 4 doesn't exist
```

---

## INNER JOIN

Returns only rows with a match in **both** tables.

```sql
SELECT c.name, o.order_id, o.amount
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id;
```
```
Alice | 101 | 50.00
Alice | 102 | 25.00
Bob   | 103 | 75.00
```
Charlie (no orders) and order 104 (no matching customer) are both excluded.

---

## LEFT JOIN

All rows from the **left** table; NULLs where the right table has no match.

```sql
SELECT c.name, o.order_id, o.amount
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
```
```
Alice   | 101  | 50.00
Alice   | 102  | 25.00
Bob     | 103  | 75.00
Charlie | NULL | NULL    ← kept, no matching order
```

---

## RIGHT JOIN

All rows from the **right** table; NULLs where the left table has no match.

```sql
SELECT c.name, o.order_id, o.amount
FROM customers c
RIGHT JOIN orders o ON c.customer_id = o.customer_id;
```
```
Alice | 101 | 50.00
Alice | 102 | 25.00
Bob   | 103 | 75.00
NULL  | 104 | 100.00   ← orphaned order kept
```

---

## FULL OUTER JOIN

All rows from **both** tables; NULLs on whichever side has no match.

```sql
SELECT c.name, o.order_id, o.amount
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
```
```
Alice   | 101  | 50.00
Alice   | 102  | 25.00
Bob     | 103  | 75.00
Charlie | NULL | NULL    ← no orders
NULL    | 104  | 100.00  ← no customer
```

---

## Summary

| Join type | Left unmatched | Right unmatched |
|-----------|---------------|----------------|
| INNER     | excluded       | excluded        |
| LEFT      | included       | excluded        |
| RIGHT     | excluded       | included        |
| FULL OUTER| included       | included        |

`RIGHT JOIN` is rare in practice — you can always rewrite it as a `LEFT JOIN` by swapping the table order, which tends to be easier to read.