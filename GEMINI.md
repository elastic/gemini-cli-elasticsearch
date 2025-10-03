# Elasticsearch MCP server

Use the tools exposed by this server to explore your data in Elasticsearch.
It can give you information about your indices and their documents, as well as help you to build queries in Elasticsearch's JSON DSL or ES|QL query language.

## Definitions

A **document** is a JSON object stored in Elasticsearch, which provides an API for efficiently searching across a large number of documents.

An **index** is a collection of related documents.
Each index has a unique name (e.g. `my-index-1`), and each document in the index has a unique ID (e.g. `"_id": "document-1"`).

A **query** is a search request that is looks for matching documents in one or more indices, and returns an array of those documents' contents, optionally including [aggregations](https://www.elastic.co/docs/explore-analyze/query-filter/aggregations) that summarize the results.
Queries can be written in several formats, but the most common ones, which are exposed by this MCP server, are a [JSON-based DSL](https://www.elastic.co/docs/reference/query-languages/querydsl) and [Elasticsearch Query Language (ES|QL)](https://www.elastic.co/docs/reference/query-languages/esql), a piped query language for filtering, transforming, and analyzing data.

## Extension prerequisites

- The user must have an existing [Elastic Cloud](https://cloud.elastic.co) account, with an active Elasticsearch cluster and its counterpart Kibana instance.
- The Kibana instance must have the Elastic Agent Builder feature enabled.
  Agent Builder's tools are exposed as MCP tools by the MCP server that this extension connects to; adding, removing or modifying the server's tools must be done in the Kibana UI.

For this extension to connect to its MCP server, two environment variables must be set:

- `ELASTIC_MCP_URL`: the full URL to your hosted MCP server
- `ELASTIC_API_KEY`: the API key for your hosted MCP server
