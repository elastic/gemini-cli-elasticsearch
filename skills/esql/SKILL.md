---
name: esql
description: >
  Interact with Elasticsearch using ES|QL and curl. Use when querying, managing indices, 
  checking cluster Elasticsearch. Requires endpoint URL and API key.
  Covers: search (using ES|QL), index management, mappings.
compatiblity: Requires Elasticsearch, curl, jq, printenv.
---

# Elasticsearch

All Elasticsearch interaction is via REST API using `curl`. No SDK or client library required.

## Authentication

To connect to Elasticsearch, a URL and an API key are required. These must be provided using two environment variables:
`ELASTIC_URL` and `ELASTIC_API_KEY`.

If either of these environment variables is not set, ask the user to provide the missing value(s) and instruct them to export the variables for the current session.

When requesting the `ELASTIC_API_KEY`, do not display it in plaintext. Instead, mask each character with an asterisk.

## IMPORTANT

Always follow these rules:
- Use only the APIs provided in this skill.
- Never display the `ELASTIC_URL` and `ELASTIC_API_KEY` in your response.

## Available APIs

The available APIs to interact with Elasticsearch are:

### Health Check

The following command can be used to check if Elasticsearch is running properly.
The cluster health can be green=ok, yellow=warning, red=problem.

```bash
curl -s "${ELASTIC_URL%/}/_cluster/health" -H "Authorization: ApiKey $(printenv ELASTIC_API_KEY)"
```

### List indices

The following command returns the list of all the Elasticsearch indices (excluding the internals).

```bash
curl -s "${ELASTIC_URL%/}/_cat/indices/*,-.internal.*?format=json" -H "Authorization: ApiKey $(printenv ELASTIC_API_KEY)"
```

### Get mapping of an index

The following command returns the mapping of an index. Replace `my-index` with the one from the user's request.

```bash
curl -s "${ELASTIC_URL%/}/my-index/_mapping" -H "Authorization: ApiKey $(printenv ELASTIC_API_KEY)"
```

### Search (using Elasticsearch Query Language, ES|QL)

When a user requests to search for data in Elasticsearch, follow this procedure:

1. **Determine the target index**
- Identify the appropriate Elasticsearch index based on the user’s request.
- If the index is not explicitly specified, use the List Indices API to retrieve available indices.
- Select the index that best matches the user’s query.

2. **Retrieve Index Mapping**
- Check whether the index mapping is already available.
- If not, use the Get Mappings API to retrieve the index mapping.
- Store the mapping information for use in query construction.

3. **Read the ES|QL reference** for syntax details:
   - [ES|QL Complete Reference](references/esql-reference.md)

4. **Generate the query** following ES|QL syntax:
   - Start with `FROM index-pattern`
   - Add `WHERE` for filtering
   - Use `EVAL` for computed fields
   - Use `STATS ... BY` for aggregations
   - Add `SORT` and `LIMIT` as needed

5. **Translate the user's request into ES|QL**
- Translate the user's request in an ES|QL query using the index mapping to translate the user’s request.
- Ensure the query aligns with the field types and structure defined in the mapping.

6. Execute the Query
- Execute the generated ES|QL query using the following API command (replace `insert-here-the-query` with the translated ES|QL query):
```bash
curl -s -X POST "${ELASTIC_URL%/}/_query" \
  -H "Authorization: ApiKey $(printenv ELASTIC_API_KEY)" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "insert-here-the-query" '{query: $q}')"
```

## ES|QL Quick Reference

### Basic Structure

```
FROM index-pattern
| WHERE condition
| EVAL new_field = expression
| STATS aggregation BY grouping
| SORT field DESC
| LIMIT n
```

### Common Patterns

**Filter and limit:**

```esql
FROM logs-*
| WHERE @timestamp > NOW() - 24 hours AND level == "error"
| SORT @timestamp DESC
| LIMIT 100
```

**Aggregate by time:**

```esql
FROM metrics-*
| WHERE @timestamp > NOW() - 7 days
| STATS avg_cpu = AVG(cpu.percent) BY bucket = DATE_TRUNC(1 hour, @timestamp)
| SORT bucket DESC
```

**Top N with count:**

```esql
FROM web-logs
| STATS count = COUNT(*) BY response.status_code
| SORT count DESC
| LIMIT 10
```

**Text search (8.17+):**

```esql
FROM documents METADATA _score
| WHERE MATCH(content, "search terms")
| SORT _score DESC
| LIMIT 20
```

## Full Reference

For complete ES|QL syntax including all commands, functions, and operators, read:

- [ES|QL Complete Reference](references/esql-reference.md)
- [Query Patterns](references/query-patterns.md) - Natural language to ES|QL translation
- [Generation Tips](references/generation-tips.md) - Best practices for query generation

## Error Handling

When query execution fails, the script returns:

- The generated ES|QL query
- The error message from Elasticsearch
- Suggestions for common issues

**Common issues:**

- Field doesn't exist → Check schema with the Get Mapping API
- Type mismatch → Use type conversion functions (TO_STRING, TO_INTEGER, etc.)
- Syntax error → Review ES|QL reference for correct syntax
- No results → Check time range and filter conditions

### Search tips

- **`?size=0`** on search requests when you only want aggregations (skip hits).
