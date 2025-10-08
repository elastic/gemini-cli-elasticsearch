The official Elasticsearch extension for the [Gemini CLI](https://github.com/google-gemini/gemini-cli) to search, retrieve, and analyze Elasticsearch data in developer and agentic workflows.

Connects directly to an Elasticsearch Model Context Protocol (MCP) server hosted in [Elastic Cloud Serverless](https://www.elastic.co/cloud/serverless).

> [!CAUTION]
> This extension is currently experimental.

## Installation & Setup

1. Install the **elasticsearch** extension:
    ```sh
    gemini extensions install https://github.com/elastic/gemini-cli-elasticsearch
    ```

2. To connect to the remote Elasticsearch MCP server, you first need to enable the Elastic Agent Builder (currently in Technical Preview) in your Elastic Cloud Serverless Kibana instance. Once enabled, the Elasticsearch MCP server's URL can be found in the Kibana Agent Builder UI by navigating to **Agents > Manage tools > MCP Server > Copy MCP Server URL**.

3. Two environment variables are necessary to connect to your Elasticsearch MCP server (and must be passed into your installed extension):

    - `ELASTIC_MCP_URL`: the full URL to your hosted MCP server
    - `ELASTIC_API_KEY`: the API key for your hosted MCP server

    The API key should be a [standard Elasticsearch API key](https://www.elastic.co/docs/deploy-manage/api-keys/elasticsearch-api-keys).

4. In the Gemini CLI, verify the **cli-elasticsearch** extension is installed and active:

    ```sh
    /extensions list
    ```

## Usage

Once installed with an active connection to the Elasticsearch MCP server, the **elasticsearch** extension automatically invokes available Tools as part of your natural language query input (where each Tool invocation is displayed as part of the CLI output response).

### Available Tools

| Tool | Description |
| -------- | -------- |
| `platform_core.search` | Used for finding documents, counting, aggregating, or summarizing data from a known index. Supports both full-text relevance searches and structured analytical queries. |
| `platform_core.get_document_by_id` | Retrieve the full content (source) of an Elasticsearch document based on its ID and index name. |
| `platform_core.get_index_mapping` | Retrieve mappings for the specified index or indices. |
| `platform_core.index_explorer` | List relevant indices, aliases and datastreams based on a natural language query. |
| `platform_core.list_indices` | List the indices, aliases and datastreams from the Elasticsearch cluster. |
| `platform_core.execute_esql` | Execute an ES\|QL query and return the results in a tabular format. |
| `platform_core.generate_esql` | Generate an ES\|QL query from a natural language query. |
