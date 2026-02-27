# ES|QL Complete Reference

ES|QL (Elasticsearch Query Language) is a piped query language for filtering, transforming, and analyzing data in Elasticsearch. It uses pipes (`|`) to chain commands together.

## Query Structure

```
source-command
| processing-command1
| processing-command2
| ...
```

An ES|QL query starts with a **source command** followed by zero or more **processing commands** separated by pipes.

---

## Source Commands

Source commands produce tables, typically from Elasticsearch data.

### FROM

Retrieves data from indices, data streams, or aliases.

**Syntax:**

```
FROM index_pattern [METADATA fields]
```

**Examples:**

```esql
// Basic usage
FROM logs-*

// Multiple indices
FROM employees-00001, other-employees-*

// With metadata
FROM logs-* METADATA _id, _index

// Date math
FROM <logs-{now/d}>

// Cross-cluster search
FROM cluster_one:logs-*, cluster_two:logs-*
```

**Note:** Without explicit `LIMIT`, queries default to 1000 rows.

### ROW

Creates a row with literal values. Useful for testing.

**Syntax:**

```
ROW column1 = value1 [, column2 = value2, ...]
```

**Examples:**

```esql
ROW a = 1, b = "two", c = null
ROW x = [1, 2, 3]
ROW greeting = "hello", pi = 3.14159
```

### SHOW

Returns information about the deployment.

**Syntax:**

```
SHOW INFO
```

---

## Processing Commands

Processing commands transform the input table.

### WHERE

Filters rows based on a boolean condition.

**Syntax:**

```
WHERE condition
```

**Examples:**

```esql
FROM employees
| WHERE salary > 50000

FROM logs-*
| WHERE status_code >= 400 AND status_code < 500

FROM events
| WHERE message LIKE "*error*"

FROM users
| WHERE name RLIKE "J.*n"

FROM data
| WHERE field IS NOT NULL
```

### EVAL

Adds or replaces columns with calculated values.

**Syntax:**

```
EVAL column1 = expression1 [, column2 = expression2, ...]
```

**Examples:**

```esql
FROM employees
| EVAL annual_salary = monthly_salary * 12

FROM logs
| EVAL duration_ms = end_time - start_time
| EVAL duration_sec = duration_ms / 1000

FROM data
| EVAL full_name = CONCAT(first_name, " ", last_name)
| EVAL is_adult = age >= 18
```

### STATS ... BY

Aggregates data, optionally grouped by columns.

**Syntax:**

```
STATS aggregation1 [, aggregation2, ...] [BY grouping1, grouping2, ...]
```

**Examples:**

```esql
// Simple count
FROM logs-*
| STATS count = COUNT(*)

// Multiple aggregations
FROM sales
| STATS
    total = SUM(amount),
    avg_amount = AVG(amount),
    max_amount = MAX(amount)

// Grouped aggregation
FROM logs-*
| STATS count = COUNT(*) BY status_code

// Multiple groupings
FROM sales
| STATS total = SUM(amount) BY region, product_category

// Time-based grouping
FROM logs-*
| STATS count = COUNT(*) BY bucket = DATE_TRUNC(1 hour, @timestamp)
```

### KEEP

Keeps only specified columns.

**Syntax:**

```
KEEP column1 [, column2, ...]
```

**Examples:**

```esql
FROM employees
| KEEP first_name, last_name, salary

// With wildcards
FROM logs-*
| KEEP @timestamp, message, error.*
```

### DROP

Removes specified columns.

**Syntax:**

```
DROP column1 [, column2, ...]
```

**Examples:**

```esql
FROM employees
| DROP internal_id, temp_field

// With wildcards
FROM data
| DROP temp_*, debug_*
```

### RENAME

Renames columns.

**Syntax:**

```
RENAME old_name AS new_name [, old_name2 AS new_name2, ...]
```

**Examples:**

```esql
FROM employees
| RENAME emp_id AS employee_id

FROM data
| RENAME col1 AS column_one, col2 AS column_two
```

### SORT

Sorts the table.

**Syntax:**

```
SORT column1 [ASC/DESC] [NULLS FIRST/LAST] [, column2 ...]
```

**Examples:**

```esql
FROM employees
| SORT salary DESC

FROM logs-*
| SORT @timestamp DESC, severity ASC

FROM data
| SORT value ASC NULLS LAST
```

### LIMIT

Limits the number of rows returned.

**Syntax:**

```
LIMIT number
```

**Examples:**

```esql
FROM logs-*
| SORT @timestamp DESC
| LIMIT 100
```

### DISSECT

Extracts structured fields from a string using a pattern.

**Syntax:**

```
DISSECT field "%{pattern}"
```

**Examples:**

```esql
FROM logs
| DISSECT message "%{clientip} - - [%{timestamp}] \"%{method} %{path}\""

FROM apache_logs
| DISSECT message "%{ip} %{} %{} [%{timestamp}] \"%{request}\" %{status} %{bytes}"
```

### GROK

Extracts fields using grok patterns (regex-based).

**Syntax:**

```
GROK field "%{PATTERN:field_name}"
```

**Common Patterns:**

- `%{IP:ip}` - IP address
- `%{NUMBER:num}` - Number
- `%{WORD:word}` - Word
- `%{DATA:data}` - Any data (non-greedy)
- `%{GREEDYDATA:text}` - Any data (greedy)
- `%{TIMESTAMP_ISO8601:ts}` - ISO timestamp

**Examples:**

```esql
FROM logs
| GROK message "%{IP:client_ip} %{WORD:method} %{NUMBER:status:int}"

FROM web_logs
| GROK agent "%{WORD:browser}/%{NUMBER:version}"
```

### ENRICH

Enriches data by looking up values from an enrich policy.

**Syntax:**

```
ENRICH policy_name ON match_field [WITH new_field1, new_field2, ...]
```

**Examples:**

```esql
FROM logs
| ENRICH geo_policy ON client_ip WITH country, city

FROM sales
| ENRICH products_policy ON product_id WITH product_name, category
```

### MV_EXPAND

Expands multivalued fields into separate rows.

**Syntax:**

```
MV_EXPAND field
```

**Examples:**

```esql
FROM data
| MV_EXPAND tags
| STATS count = COUNT(*) BY tags
```

### LOOKUP JOIN

Joins with a lookup index.

**Syntax:**

```
LOOKUP JOIN index ON field
```

**Examples:**

```esql
FROM orders
| LOOKUP JOIN customers ON customer_id
```

---

## Aggregate Functions

Used with STATS command.

| Function                    | Description           | Example                                    |
| --------------------------- | --------------------- | ------------------------------------------ |
| `COUNT(*)`                  | Count all rows        | `STATS n = COUNT(*)`                       |
| `COUNT(field)`              | Count non-null values | `STATS n = COUNT(status)`                  |
| `COUNT_DISTINCT(field)`     | Count unique values   | `STATS unique = COUNT_DISTINCT(user_id)`   |
| `SUM(field)`                | Sum of values         | `STATS total = SUM(amount)`                |
| `AVG(field)`                | Average               | `STATS avg_price = AVG(price)`             |
| `MIN(field)`                | Minimum value         | `STATS min_temp = MIN(temperature)`        |
| `MAX(field)`                | Maximum value         | `STATS max_score = MAX(score)`             |
| `MEDIAN(field)`             | Median value          | `STATS med = MEDIAN(response_time)`        |
| `PERCENTILE(field, p)`      | Percentile            | `STATS p95 = PERCENTILE(latency, 95)`      |
| `STD_DEV(field)`            | Standard deviation    | `STATS sd = STD_DEV(values)`               |
| `VARIANCE(field)`           | Variance              | `STATS var = VARIANCE(values)`             |
| `VALUES(field)`             | Collect all values    | `STATS all_tags = VALUES(tag)`             |
| `TOP(field, n, order)`      | Top N values          | `STATS top3 = TOP(score, 3, "desc")`       |
| `WEIGHTED_AVG(val, weight)` | Weighted average      | `STATS wavg = WEIGHTED_AVG(score, weight)` |

---

## String Functions

| Function                   | Description         | Example                                     |
| -------------------------- | ------------------- | ------------------------------------------- |
| `LENGTH(s)`                | String length       | `EVAL len = LENGTH(name)`                   |
| `CONCAT(s1, s2, ...)`      | Concatenate strings | `EVAL full = CONCAT(first, " ", last)`      |
| `SUBSTRING(s, start, len)` | Extract substring   | `EVAL sub = SUBSTRING(text, 1, 10)`         |
| `LEFT(s, n)`               | Left n characters   | `EVAL l = LEFT(text, 5)`                    |
| `RIGHT(s, n)`              | Right n characters  | `EVAL r = RIGHT(text, 5)`                   |
| `TRIM(s)`                  | Remove whitespace   | `EVAL clean = TRIM(input)`                  |
| `LTRIM(s)`                 | Trim left           | `EVAL clean = LTRIM(input)`                 |
| `RTRIM(s)`                 | Trim right          | `EVAL clean = RTRIM(input)`                 |
| `TO_UPPER(s)`              | Uppercase           | `EVAL upper = TO_UPPER(name)`               |
| `TO_LOWER(s)`              | Lowercase           | `EVAL lower = TO_LOWER(name)`               |
| `REPLACE(s, old, new)`     | Replace text        | `EVAL fixed = REPLACE(msg, "err", "error")` |
| `SPLIT(s, delim)`          | Split into array    | `EVAL parts = SPLIT(path, "/")`             |
| `STARTS_WITH(s, prefix)`   | Check prefix        | `WHERE STARTS_WITH(url, "https")`           |
| `ENDS_WITH(s, suffix)`     | Check suffix        | `WHERE ENDS_WITH(file, ".log")`             |
| `CONTAINS(s, substr)`      | Check contains      | `WHERE CONTAINS(message, "error")`          |
| `LOCATE(substr, s)`        | Find position       | `EVAL pos = LOCATE("@", email)`             |
| `REVERSE(s)`               | Reverse string      | `EVAL rev = REVERSE(text)`                  |
| `REPEAT(s, n)`             | Repeat string       | `EVAL sep = REPEAT("-", 10)`                |
| `SPACE(n)`                 | N spaces            | `EVAL spaces = SPACE(5)`                    |

---

## Math Functions

| Function                        | Description       | Example                                  |
| ------------------------------- | ----------------- | ---------------------------------------- |
| `ABS(n)`                        | Absolute value    | `EVAL abs_val = ABS(diff)`               |
| `ROUND(n, decimals)`            | Round             | `EVAL rounded = ROUND(price, 2)`         |
| `FLOOR(n)`                      | Round down        | `EVAL floored = FLOOR(value)`            |
| `CEIL(n)`                       | Round up          | `EVAL ceiled = CEIL(value)`              |
| `SQRT(n)`                       | Square root       | `EVAL root = SQRT(area)`                 |
| `POW(base, exp)`                | Power             | `EVAL squared = POW(x, 2)`               |
| `EXP(n)`                        | e^n               | `EVAL e_power = EXP(x)`                  |
| `LOG(n)`                        | Natural log       | `EVAL ln = LOG(value)`                   |
| `LOG10(n)`                      | Log base 10       | `EVAL log = LOG10(value)`                |
| `SIN(n)`, `COS(n)`, `TAN(n)`    | Trig functions    | `EVAL sine = SIN(angle)`                 |
| `ASIN(n)`, `ACOS(n)`, `ATAN(n)` | Inverse trig      | `EVAL angle = ASIN(ratio)`               |
| `PI()`                          | Pi constant       | `EVAL circumference = 2 * PI() * radius` |
| `E()`                           | Euler's number    | `EVAL e = E()`                           |
| `SIGNUM(n)`                     | Sign (-1, 0, 1)   | `EVAL sign = SIGNUM(value)`              |
| `GREATEST(a, b, ...)`           | Maximum of values | `EVAL max = GREATEST(a, b, c)`           |
| `LEAST(a, b, ...)`              | Minimum of values | `EVAL min = LEAST(a, b, c)`              |

---

## Date/Time Functions

| Function                     | Description          | Example                                      |
| ---------------------------- | -------------------- | -------------------------------------------- |
| `NOW()`                      | Current timestamp    | `WHERE @timestamp > NOW() - 1 hour`          |
| `DATE_TRUNC(interval, date)` | Truncate to interval | `EVAL hour = DATE_TRUNC(1 hour, @timestamp)` |
| `DATE_EXTRACT(part, date)`   | Extract part         | `EVAL month = DATE_EXTRACT(month, date)`     |
| `DATE_FORMAT(pattern, date)` | Format date          | `EVAL str = DATE_FORMAT("yyyy-MM-dd", date)` |
| `DATE_PARSE(pattern, str)`   | Parse date string    | `EVAL dt = DATE_PARSE("yyyy-MM-dd", str)`    |
| `DATE_DIFF(unit, d1, d2)`    | Difference           | `EVAL days = DATE_DIFF("day", start, end)`   |

**Time units:** `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `year`

**Timespan literals:** `1 day`, `2 hours`, `30 minutes`, `1 week`

---

## Type Conversion Functions

| Function         | Description         | Example                       |
| ---------------- | ------------------- | ----------------------------- |
| `TO_STRING(v)`   | Convert to string   | `EVAL str = TO_STRING(num)`   |
| `TO_INTEGER(v)`  | Convert to integer  | `EVAL int = TO_INTEGER(str)`  |
| `TO_LONG(v)`     | Convert to long     | `EVAL lng = TO_LONG(str)`     |
| `TO_DOUBLE(v)`   | Convert to double   | `EVAL dbl = TO_DOUBLE(str)`   |
| `TO_BOOLEAN(v)`  | Convert to boolean  | `EVAL bool = TO_BOOLEAN(str)` |
| `TO_DATETIME(v)` | Convert to datetime | `EVAL dt = TO_DATETIME(str)`  |
| `TO_IP(v)`       | Convert to IP       | `EVAL ip = TO_IP(str)`        |
| `TO_VERSION(v)`  | Convert to version  | `EVAL ver = TO_VERSION(str)`  |

---

## Multivalue Functions

For handling fields with multiple values.

| Function                      | Description       | Example                              |
| ----------------------------- | ----------------- | ------------------------------------ |
| `MV_COUNT(field)`             | Count values      | `EVAL n = MV_COUNT(tags)`            |
| `MV_FIRST(field)`             | First value       | `EVAL first = MV_FIRST(values)`      |
| `MV_LAST(field)`              | Last value        | `EVAL last = MV_LAST(values)`        |
| `MV_MIN(field)`               | Minimum           | `EVAL min = MV_MIN(scores)`          |
| `MV_MAX(field)`               | Maximum           | `EVAL max = MV_MAX(scores)`          |
| `MV_SUM(field)`               | Sum               | `EVAL total = MV_SUM(amounts)`       |
| `MV_AVG(field)`               | Average           | `EVAL avg = MV_AVG(scores)`          |
| `MV_MEDIAN(field)`            | Median            | `EVAL med = MV_MEDIAN(values)`       |
| `MV_CONCAT(field, delim)`     | Join to string    | `EVAL str = MV_CONCAT(tags, ", ")`   |
| `MV_DEDUPE(field)`            | Remove duplicates | `EVAL unique = MV_DEDUPE(tags)`      |
| `MV_SORT(field)`              | Sort values       | `EVAL sorted = MV_SORT(values)`      |
| `MV_SLICE(field, start, end)` | Slice array       | `EVAL slice = MV_SLICE(arr, 0, 3)`   |
| `MV_ZIP(f1, f2)`              | Zip arrays        | `EVAL zipped = MV_ZIP(keys, values)` |

---

## Conditional Functions

| Function                          | Description    | Example                                                    |
| --------------------------------- | -------------- | ---------------------------------------------------------- |
| `CASE(cond1, val1, ..., default)` | Conditional    | `EVAL level = CASE(score > 90, "A", score > 80, "B", "C")` |
| `COALESCE(v1, v2, ...)`           | First non-null | `EVAL name = COALESCE(nickname, full_name, "Unknown")`     |
| `NULLIF(v1, v2)`                  | Null if equal  | `EVAL val = NULLIF(x, 0)`                                  |
| `IS_NULL(field)`                  | Check null     | `WHERE IS_NULL(error)`                                     |
| `IS_NOT_NULL(field)`              | Check not null | `WHERE IS_NOT_NULL(response)`                              |

---

## Full-Text Search Functions

For text search with analyzer support (available since 8.17+).

### MATCH

Basic text search.

```esql
FROM articles
| WHERE MATCH(content, "elasticsearch query")

// With options
FROM docs
| WHERE MATCH(title, "search", {"operator": "AND"})
```

### MATCH (colon operator)

Shorthand for MATCH.

```esql
FROM logs
| WHERE message : "error"
```

### QSTR (Query String)

Complex queries using query string syntax.

```esql
FROM logs
| WHERE QSTR("status:error AND (type:critical OR type:warning)")
```

### KQL

Kibana Query Language support.

```esql
FROM logs
| WHERE KQL("message: error and host.name: server*")
```

### Relevance Scoring

```esql
FROM articles METADATA _score
| WHERE MATCH(content, "elasticsearch")
| SORT _score DESC
| LIMIT 10
```

---

## Operators

### Comparison Operators

- `==` Equal
- `!=` Not equal
- `<`, `<=`, `>`, `>=` Comparison
- `IS NULL`, `IS NOT NULL` Null checks

### Logical Operators

- `AND` Logical AND
- `OR` Logical OR
- `NOT` Logical NOT

### Pattern Matching

- `LIKE` Wildcard pattern (`%` any chars, `_` single char)
- `RLIKE` Regular expression
- `IN` Value in list

**Examples:**

```esql
WHERE name LIKE "John%"
WHERE email RLIKE ".*@example\\.com"
WHERE status IN ("active", "pending")
WHERE NOT (status == "deleted")
```

### Arithmetic Operators

- `+`, `-`, `*`, `/`, `%` (modulo)

---

## Comments

```esql
// Single line comment

/* Multi-line
   comment */

FROM logs  // inline comment
| WHERE status == 200
```

---

## Metadata Fields

Access document metadata with `METADATA` clause.

```esql
FROM logs METADATA _id, _index, _version
| KEEP _id, message
```

Available metadata: `_id`, `_index`, `_version`, `_score` (for search)

---

## Best Practices

1. **Always use LIMIT** to avoid returning too many rows
2. **Filter early** with WHERE to reduce data processed
3. **Use KEEP** to select only needed columns
4. **Use appropriate data types** for comparisons
5. **Use STATS for aggregations** instead of returning all rows
6. **Use DATE_TRUNC for time-based grouping**
7. **Leverage full-text functions** (MATCH, QSTR) for text search - much faster than LIKE/RLIKE

---

## Example Queries

### Log Analysis

```esql
FROM logs-*
| WHERE @timestamp > NOW() - 24 hours
| WHERE status_code >= 400
| STATS error_count = COUNT(*) BY status_code, host.name
| SORT error_count DESC
| LIMIT 20
```

### User Activity

```esql
FROM user_events
| WHERE event_type == "login"
| EVAL hour = DATE_TRUNC(1 hour, @timestamp)
| STATS logins = COUNT(*), unique_users = COUNT_DISTINCT(user_id) BY hour
| SORT hour DESC
```

### Performance Metrics

```esql
FROM metrics-*
| WHERE @timestamp > NOW() - 1 hour
| STATS
    avg_response = AVG(response_time),
    p95_response = PERCENTILE(response_time, 95),
    max_response = MAX(response_time)
  BY service.name
| SORT avg_response DESC
```

### Text Search with Scoring

```esql
FROM articles METADATA _score
| WHERE MATCH(content, "machine learning")
| KEEP title, author, _score
| SORT _score DESC
| LIMIT 10
```

### Data Transformation

```esql
FROM raw_logs
| GROK message "%{IP:client_ip} - %{WORD:method} %{URIPATHPARAM:path} %{NUMBER:status:int}"
| EVAL is_error = status >= 400
| STATS
    total = COUNT(*),
    errors = COUNT(CASE(is_error, 1, null))
  BY client_ip
| EVAL error_rate = ROUND(errors * 100.0 / total, 2)
| SORT error_rate DESC
```