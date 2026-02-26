# ES|QL Query Patterns

Common patterns for generating ES|QL queries from natural language requests.

## Pattern Recognition Guide

When translating natural language to ES|QL, identify these key elements:

| User Says                               | ES\|QL Element                            |
| --------------------------------------- | ----------------------------------------- |
| "show", "list", "get", "find"           | `FROM` + `KEEP` (select fields)           |
| "from", "in" (index)                    | `FROM index-pattern`                      |
| "where", "with", "that have", "filter"  | `WHERE condition`                         |
| "last X hours/days", "since", "between" | `WHERE @timestamp > NOW() - X time`       |
| "count", "how many"                     | `STATS count = COUNT(*)`                  |
| "average", "mean"                       | `STATS avg = AVG(field)`                  |
| "total", "sum"                          | `STATS total = SUM(field)`                |
| "maximum", "highest", "top value"       | `STATS max = MAX(field)`                  |
| "minimum", "lowest"                     | `STATS min = MIN(field)`                  |
| "by", "per", "grouped by", "for each"   | `... BY field`                            |
| "top N", "first N", "limit"             | `LIMIT N`                                 |
| "sorted by", "order by"                 | `SORT field [DESC/ASC]`                   |
| "unique", "distinct"                    | `COUNT_DISTINCT(field)`                   |
| "contains", "includes"                  | `WHERE field LIKE "*value*"` or `MATCH()` |
| "starts with"                           | `WHERE STARTS_WITH(field, "prefix")`      |
| "ends with"                             | `WHERE ENDS_WITH(field, "suffix")`        |

---

## Time-Based Queries

### Recent Data

```
"show errors from the last hour"
→
FROM logs-*
| WHERE @timestamp > NOW() - 1 hour
| WHERE level == "error"
| SORT @timestamp DESC
| LIMIT 100
```

### Time Range

```
"events between January 1 and January 15, 2024"
→
FROM events-*
| WHERE @timestamp >= "2024-01-01" AND @timestamp < "2024-01-16"
```

### Time Bucketing

```
"count events per hour for today"
→
FROM events-*
| WHERE @timestamp > NOW() - 24 hours
| STATS count = COUNT(*) BY bucket = DATE_TRUNC(1 hour, @timestamp)
| SORT bucket DESC
```

### Time Comparisons

```
"requests slower than 5 seconds"
→
FROM api-logs
| WHERE response_time > 5000
| SORT response_time DESC
| LIMIT 100
```

---

## Aggregation Patterns

### Simple Count

```
"how many errors are there"
→
FROM logs-*
| WHERE level == "error"
| STATS total_errors = COUNT(*)
```

### Count by Category

```
"count of events by status code"
→
FROM web-logs
| STATS count = COUNT(*) BY status_code
| SORT count DESC
```

### Multiple Aggregations

```
"show min, max, and average response time"
→
FROM api-logs
| STATS
    min_time = MIN(response_time),
    max_time = MAX(response_time),
    avg_time = AVG(response_time)
```

### Grouped Multiple Aggregations

```
"average and max CPU per host"
→
FROM metrics-*
| STATS
    avg_cpu = AVG(system.cpu.percent),
    max_cpu = MAX(system.cpu.percent)
  BY host.name
| SORT avg_cpu DESC
```

### Top N Pattern

```
"top 10 hosts by error count"
→
FROM logs-*
| WHERE level == "error"
| STATS error_count = COUNT(*) BY host.name
| SORT error_count DESC
| LIMIT 10
```

### Percentiles

```
"p50, p95, p99 response times by endpoint"
→
FROM api-logs
| STATS
    p50 = PERCENTILE(response_time, 50),
    p95 = PERCENTILE(response_time, 95),
    p99 = PERCENTILE(response_time, 99)
  BY endpoint
| SORT p99 DESC
```

### Unique Counts

```
"count of unique users per day"
→
FROM user-events
| STATS unique_users = COUNT_DISTINCT(user_id) BY day = DATE_TRUNC(1 day, @timestamp)
| SORT day DESC
```

---

## Filtering Patterns

### Exact Match

```
"errors from production"
→
FROM logs-*
| WHERE level == "error" AND environment == "production"
```

### Multiple Values (IN)

```
"events with status 400, 401, or 403"
→
FROM web-logs
| WHERE status_code IN (400, 401, 403)
```

### Pattern Matching

```
"requests to /api endpoints"
→
FROM web-logs
| WHERE url LIKE "/api/*"
```

### Full-Text Search (8.17+)

```
"documents containing 'connection timeout'"
→
FROM logs-* METADATA _score
| WHERE MATCH(message, "connection timeout")
| SORT _score DESC
| LIMIT 100
```

### Null Handling

```
"records where error field exists"
→
FROM logs-*
| WHERE error IS NOT NULL
```

### Negation

```
"all events except from test environment"
→
FROM events-*
| WHERE environment != "test"
```

---

## Transformation Patterns

### Computed Fields

```
"show response time in seconds"
→
FROM api-logs
| EVAL response_time_sec = response_time_ms / 1000
| KEEP endpoint, response_time_sec
```

### String Manipulation

```
"extract domain from email addresses"
→
FROM users
| EVAL domain = SUBSTRING(email, LOCATE("@", email) + 1, LENGTH(email))
| KEEP email, domain
```

### Conditional Values

```
"categorize response times as fast/medium/slow"
→
FROM api-logs
| EVAL speed_category = CASE(
    response_time < 100, "fast",
    response_time < 500, "medium",
    "slow"
  )
| STATS count = COUNT(*) BY speed_category
```

### Rate Calculation

```
"error rate percentage by service"
→
FROM logs-*
| STATS
    total = COUNT(*),
    errors = COUNT(CASE(level == "error", 1, null))
  BY service.name
| EVAL error_rate = ROUND(errors * 100.0 / total, 2)
| SORT error_rate DESC
```

---

## Log Parsing Patterns

### GROK for Structured Extraction

```
"parse Apache access logs"
→
FROM raw-logs
| GROK message "%{IP:client_ip} - - \\[%{HTTPDATE:timestamp}\\] \"%{WORD:method} %{URIPATHPARAM:path} HTTP/%{NUMBER:http_version}\" %{NUMBER:status:int} %{NUMBER:bytes:int}"
| KEEP client_ip, method, path, status, bytes
```

### DISSECT for Simple Patterns

```
"extract user and action from 'User X performed Y'"
→
FROM audit-logs
| DISSECT message "User %{user} performed %{action}"
| STATS count = COUNT(*) BY user, action
```

---

## Advanced Patterns

### Multi-Index Query

```
"combine data from logs and metrics"
→
FROM logs-*, metrics-*
| WHERE @timestamp > NOW() - 1 hour
| KEEP @timestamp, host.name, message, cpu.percent
```

### Data Enrichment

```
"add geo info to IP addresses"
→
FROM web-logs
| ENRICH geoip-policy ON client.ip WITH country_name, city_name
| STATS requests = COUNT(*) BY country_name
| SORT requests DESC
```

### Multivalue Handling

```
"count occurrences of each tag"
→
FROM documents
| MV_EXPAND tags
| STATS count = COUNT(*) BY tags
| SORT count DESC
```

### Chained Aggregations

```
"average daily count per week"
→
FROM events
| STATS daily_count = COUNT(*) BY day = DATE_TRUNC(1 day, @timestamp)
| STATS avg_daily = AVG(daily_count) BY week = DATE_TRUNC(1 week, day)
| SORT week DESC
```

---

## Common Mistakes to Avoid

1. **Forgetting LIMIT** - Always add `LIMIT` to prevent returning too many rows

2. **Wrong time field** - Common names: `@timestamp`, `timestamp`, `time`, `date`

3. **Case sensitivity** - Field names are case-sensitive: `host.Name` ≠ `host.name`

4. **String vs Keyword** - Use `.keyword` suffix for exact matches on text fields:

   ```esql
   WHERE status.keyword == "active"
   ```

5. **Type mismatches** - Convert types when needed:

   ```esql
   | EVAL num = TO_INTEGER(string_field)
   ```

6. **STATS without aggregation** - STATS requires aggregate functions:

   ```esql
   // Wrong: | STATS BY host
   // Right: | STATS count = COUNT(*) BY host
   ```

7. **Missing FROM** - Every query must start with a source command

8. **Pipe placement** - Each command needs a pipe before it (except FROM)
