# Elasticsearch MCP server

Use the tools exposed by this server to explore your data in Elasticsearch.
It can give you information about your indices and their documents, as well as help you to build queries in Elasticsearch's JSON DSL or ES|QL query language.

## Definitions

**Elasticsearch** is a search and analytics engine, scalable data store, and vector database built on Apache Lucene.

A **document** is a JSON object stored in Elasticsearch.
A document is a set of fields, which are key-value pairs that contain your data.
Each document has a unique ID, which you can create or have Elasticsearch auto-generate.

An **index** is a collection of documents uniquely identified by a name or an alias.
Each index has a unique name (e.g. `my-index-1`), and each document in the index has a unique ID (e.g. `"_id": "document-1"`).
This unique name is important because it’s used to target the index in search queries and other operations.

A **field** is a single key-value pair in a document.
It is equivalent to a key-value pair in a JSON object, or similar to a column in a SQL database.
A field typically has a type, defined in an index mapping.
All fields in an index are optional, since there is no way to mark a field as required in a mapping.

A **mapping** is a schema describing the data type of each field in an index.
Mappings are defined either dynamically (Elasticsearch auto-detects each type when a document is indexed) or explicitly (you define the types in a JSON-formatted schema).

A **query** is a search request that is looks for matching documents in one or more indices, and returns an array of those documents' contents, optionally including [aggregations](https://www.elastic.co/docs/explore-analyze/query-filter/aggregations) that summarize the results.
Queries can be written in several formats, but the most common ones, which are exposed by this MCP server, are a [JSON-based DSL](https://www.elastic.co/docs/reference/query-languages/querydsl) and [Elasticsearch Query Language (ES|QL)](https://www.elastic.co/docs/reference/query-languages/esql), a piped query language for filtering, transforming, and analyzing data.

## Extension prerequisites

- The user must have an existing [Elastic Cloud](https://cloud.elastic.co) account, with an active Elasticsearch cluster and its counterpart Kibana instance.
- The Kibana instance must have the Elastic Agent Builder feature enabled (this is required only for using MCP, for the SKILLs this is not required).
  Agent Builder's tools are exposed as tools in the MCP server that this extension consumes; adding, removing or modifying tools must be done in the Kibana UI.

For this extension to connect to its MCP server, two environment variables must be set:

- `ELASTIC_MCP_URL`: the full URL to your hosted MCP server
- `ELASTIC_API_KEY`: the API key for your hosted MCP server

This extension provides also a set of SKILLs in the `/skills` folder. For these two environment variables must be set:

- `ELASTIC_URL`: the full URL to your hosted Elasticsearch
- `ELASTIC_API_KEY`: the API key for your hosted Elasticsearch
