<!-- after / full-stack-developer / so-38549-inner-vs-outer-join / run 3 -->

**Duration**: 37.7s
**Strict pass**: false
**Timed out**: false
**Failure reason**: all-of branch failed: none of the any-of branches passed: output did not match /inner\s+join\s+(returns|produces|yields|gives)\s+(only\s+)?(rows?|records?)\s+(where|that)\s+(match|join|exist)/i | output did not match /(only|just)\s+(matching|matched)\s+(rows?|records?)/i

---
Here is a full breakdown of SQL JOIN types:

---

## The Two Example Tables

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

Carol (id=3) has no orders. Order 104 references a customer (id=99) that doesn't exist.

---

## INNER JOIN

Returns only rows where the condition matches **in both tables**. Unmatched rows on either side are dropped.

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

Carol and the Monitor order are both dropped — no match in the other table.

---

## LEFT OUTER JOIN

Returns **all rows from the left table**, with `NULL` for right-table columns where there's no match.

```sql
SELECT c.name, o.item
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | item     |
|-------|----------|
| Alice | Laptop   |
| Alice | Mouse    |
| Bob   | Keyboard |
| Carol | NULL     |

Carol appears with `NULL`. Monitor is still dropped (its customer isn't in the left table).

---

## RIGHT OUTER JOIN

The mirror of LEFT JOIN — returns **all rows from the right table**, with `NULL` for left-table columns where there's no match.

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

Monitor appears with `NULL`. Carol is dropped (she has no order in the right table). In practice, RIGHT JOIN is rare — most developers swap table order and use LEFT JOIN instead.

---

## FULL OUTER JOIN

Returns **all rows from both tables**, with `NULL` filling in wherever there's no match.

```sql
SELECT c.name, o.item
FROM customers c
FULL OUTER JOIN orders o ON c.customer_id = o.customer_id;
```

| name  | item     |
|-------|----------|
| Alice | Laptop   |
| Alice | Mouse    |
| Bob   | Keyboard |
| Carol | NULL     |
| NULL  | Monitor  |

Both unmatched rows appear. Useful for data audits and finding orphaned records.

---

## Summary Table

| Join Type        | Keeps unmatched LEFT rows? | Keeps unmatched RIGHT rows? |
|------------------|----------------------------|-----------------------------|
| INNER JOIN       | No                         | No                          |
| LEFT OUTER JOIN  | **Yes**                    | No                          |
| RIGHT OUTER JOIN | No                         | **Yes**                     |
| FULL OUTER JOIN  | **Yes**                    | **Yes**                     |

**Decision rule:** Ask "which table's rows must I never lose?" — that table goes on the matching side of a LEFT/RIGHT JOIN. If the answer is "both," use FULL OUTER JOIN. If you only care about confirmed matches, use INNER JOIN.