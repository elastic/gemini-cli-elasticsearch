# ES|QL Query Generation Tips

Guidelines for generating accurate ES|QL queries from natural language.

## Step-by-Step Generation Process

### 1. Identify the Data Source

**Question:** What index or data should be queried?

- Look for index names, data types, or subject areas mentioned
- Common patterns: `logs-*`, `metrics-*`, `events-*`, `apm-*`
- If unclear, use wildcards or ask for clarification

```esql
FROM logs-*           // Generic logs
FROM metrics-*        // Metrics data
FROM .ds-*            // Data streams
FROM my-index-2024.*  // Dated indices
```

### 2. Determine Time Range

**Question:** What time period should be covered?

| User Expression | ES\|QL                                                             |
| --------------- | ------------------------------------------------------------------ |
| "last hour"     | `@timestamp > NOW() - 1 hour`                                      |
| "last 24 hours" | `@timestamp > NOW() - 24 hours`                                    |
| "last 7 days"   | `@timestamp > NOW() - 7 days`                                      |
| "today"         | `@timestamp > NOW() - 24 hours`                                    |
| "yesterday"     | `@timestamp >= NOW() - 48 hours AND @timestamp < NOW() - 24 hours` |
| "this week"     | `@timestamp > NOW() - 7 days`                                      |
| "this month"    | `@timestamp > NOW() - 30 days`                                     |

**Default:** If no time range specified, consider adding a reasonable default (e.g., last 24 hours) to avoid scanning too much data.

### 3. Identify Filters

**Question:** What conditions should narrow the results?

Look for:

- Status/level: "errors", "warnings", "successful"
- Environment: "production", "staging", "dev"
- Source/host: specific servers, services, applications
- Values: specific codes, IDs, names

```esql
// Multiple filters
| WHERE level == "error"
| WHERE environment == "production"
| WHERE service.name == "api-gateway"
```

Or combined:

```esql
| WHERE level == "error" AND environment == "production" AND service.name == "api-gateway"
```

### 4. Determine Output Type

**Question:** Does the user want raw data or aggregated results?

| User Intent                   | Approach                        |
| ----------------------------- | ------------------------------- |
| "show me", "list", "find"     | Raw data with KEEP, SORT, LIMIT |
| "count", "how many"           | STATS with COUNT                |
| "average", "total", "sum"     | STATS with aggregation function |
| "by X", "per X", "grouped by" | STATS ... BY grouping           |
| "top N", "most common"        | STATS + SORT DESC + LIMIT       |
| "distribution", "breakdown"   | STATS COUNT BY category         |
| "over time", "trend"          | STATS BY DATE_TRUNC             |

### 5. Select Fields

**Question:** What fields should be shown?

For raw data queries, use KEEP to select relevant fields:

```esql
| KEEP @timestamp, host.name, message, level
```

For aggregations, the output fields are defined by STATS:

```esql
| STATS count = COUNT(*), avg_time = AVG(response_time) BY endpoint
```

### 6. Apply Ordering and Limits

**Question:** How should results be ordered and limited?

- Time-based: `SORT @timestamp DESC`
- By count/value: `SORT count DESC`
- Alphabetical: `SORT name ASC`

**Always add LIMIT** unless the user specifically wants all results:

```esql
| LIMIT 100  // Reasonable default
| LIMIT 1000 // Maximum before considering pagination
```

---

## Field Name Conventions

When generating queries, use common field naming conventions:

### Elastic Common Schema (ECS)

| Category    | Common Fields                                                  |
| ----------- | -------------------------------------------------------------- |
| Timestamp   | `@timestamp`                                                   |
| Message     | `message`                                                      |
| Log level   | `log.level`, `level`                                           |
| Host        | `host.name`, `host.ip`                                         |
| Service     | `service.name`, `service.type`                                 |
| HTTP        | `http.request.method`, `http.response.status_code`, `url.path` |
| User        | `user.name`, `user.id`                                         |
| Source      | `source.ip`, `source.port`                                     |
| Destination | `destination.ip`, `destination.port`                           |
| Error       | `error.message`, `error.type`                                  |
| Event       | `event.action`, `event.category`, `event.outcome`              |

### Legacy/Custom Fields

Some indices may use non-ECS field names:

- `status_code` instead of `http.response.status_code`
- `hostname` instead of `host.name`
- `timestamp` instead of `@timestamp`

**Recommendation:** When unsure, use `./esql.js schema <index>` to discover actual field names.

---

## Query Optimization Tips

### 1. Filter Early

Put WHERE clauses as early as possible:

```esql
// Good - filter first
FROM logs-*
| WHERE @timestamp > NOW() - 1 hour
| WHERE level == "error"
| STATS count = COUNT(*) BY host.name

// Less efficient - filtering after processing
FROM logs-*
| STATS count = COUNT(*) BY host.name, level
| WHERE level == "error"
```

### 2. Use Appropriate Time Ranges

Smaller time ranges = faster queries:

```esql
// Specific range is faster
| WHERE @timestamp > NOW() - 1 hour

// Than scanning all data
// (no time filter)
```

### 3. Limit Fields

Only keep fields you need:

```esql
// Good - specific fields
| KEEP @timestamp, message, host.name

// Less efficient - all fields
// (no KEEP command)
```

### 4. Use LIMIT

Prevent returning excessive rows:

```esql
| LIMIT 100  // Always include for raw data queries
```

---

## Common Query Templates

### Error Investigation

```esql
FROM logs-*
| WHERE @timestamp > NOW() - 1 hour
| WHERE level == "error"
| KEEP @timestamp, message, host.name, service.name, error.message
| SORT @timestamp DESC
| LIMIT 100
```

### Service Health Overview

```esql
FROM metrics-*
| WHERE @timestamp > NOW() - 15 minutes
| STATS
    avg_cpu = AVG(system.cpu.percent),
    avg_mem = AVG(system.memory.used.pct),
    host_count = COUNT_DISTINCT(host.name)
  BY service.name
| SORT avg_cpu DESC
```

### API Performance Analysis

```esql
FROM apm-*
| WHERE @timestamp > NOW() - 1 hour
| STATS
    count = COUNT(*),
    avg_duration = AVG(transaction.duration.us),
    p95_duration = PERCENTILE(transaction.duration.us, 95),
    error_count = COUNT(CASE(transaction.result != "success", 1, null))
  BY transaction.name
| EVAL error_rate = ROUND(error_count * 100.0 / count, 2)
| SORT count DESC
| LIMIT 20
```

### Traffic Analysis

```esql
FROM web-logs
| WHERE @timestamp > NOW() - 24 hours
| STATS
    requests = COUNT(*),
    unique_ips = COUNT_DISTINCT(client.ip)
  BY hour = DATE_TRUNC(1 hour, @timestamp)
| SORT hour DESC
```

### Security Event Review

```esql
FROM security-*
| WHERE @timestamp > NOW() - 24 hours
| WHERE event.category == "authentication"
| WHERE event.outcome == "failure"
| STATS
    failures = COUNT(*)
  BY user.name, source.ip
| WHERE failures > 5
| SORT failures DESC
```

---

## Handling Ambiguity

When the user request is ambiguous:

### Missing Index

If no index specified, make a reasonable assumption:

- "show errors" → `FROM logs-*`
- "show CPU usage" → `FROM metrics-*`
- "show requests" → `FROM web-logs` or `FROM access-*`

Or output the query with a placeholder and note:

```esql
FROM <index-pattern>  // Specify your index
| WHERE ...
```

### Missing Time Range

Add a sensible default:

```esql
| WHERE @timestamp > NOW() - 24 hours  // Default: last 24 hours
```

### Unclear Aggregation

When "show X" could mean list or count:

- If followed by "by Y" → aggregation
- If asking for specifics → raw data
- If asking "how many" → count
- Default to raw data with limit

### Unknown Field Names

If field names are uncertain:

1. Use common ECS names as first guess
2. Suggest running schema discovery
3. Note the assumption in output

---

## Output Formatting Suggestions

When presenting generated queries:

```
=== ES|QL Query ===

FROM logs-*
| WHERE @timestamp > NOW() - 1 hour
| WHERE level == "error"
| STATS count = COUNT(*) BY host.name
| SORT count DESC
| LIMIT 10

=== Explanation ===
- Queries all log indices
- Filters to the last hour
- Counts errors per host
- Returns top 10 hosts by error count

=== To Execute ===
./esql.js raw "FROM logs-* | WHERE @timestamp > NOW() - 1 hour | WHERE level == \"error\" | STATS count = COUNT(*) BY host.name | SORT count DESC | LIMIT 10"
```
