The official Elasticsearch extension for the [Gemini CLI](https://github.com/google-gemini/gemini-cli) to search, retrieve, and analyze Elasticsearch data in developer and agentic workflows.

Connects directly to an Elasticsearch Model Context Protocol (MCP) server hosted in [Elastic Cloud Serverless](https://www.elastic.co/cloud/serverless).

> [!CAUTION]
> This extension is currently experimental.

## Installation & Setup

1. Install the **elasticsearch** extension:
    ```sh
    gemini extensions install https://github.com/elastic/gemini-cli-elasticsearch
    ```

2. Enable the Elastic Agent Builder (currently in Technical Preview) in your Elastic Cloud Serverless Kibana instance:
    - Navigate to **Management > Agent Builder > Enable**
    - Once enabled, get your MCP server URL from **Agents > Manage tools > MCP Server > Copy MCP Server URL**
    - The URL will look like: `https://your-deployment.kb.region.gcp.elastic.cloud/api/agent_builder/mcp`

3. Create a [standard Elasticsearch API key](https://www.elastic.co/docs/deploy-manage/api-keys/elasticsearch-api-keys):
    - In Kibana: **Stack Management > Security > API Keys > Create API key**
    - Copy the **encoded** API key value

4. Set the required environment variables in your shell:

    ```sh
    export ELASTIC_MCP_URL="https://your-deployment.kb.region.gcp.elastic.cloud/api/agent_builder/mcp"
    export ELASTIC_API_KEY="your-encoded-api-key"
    ```

    To make these permanent, add them to your shell config file (`~/.bashrc`, `~/.zshrc`, `~/.config/fish/config.fish`, etc.)

5. Verify the extension is installed and active:

    ```sh
    gemini extensions list
    ```

6. Verify the MCP server connection:

    ```sh
    gemini mcp list
    ```
    
    You should see `✓ elastic-agent-builder ... - Connected`

7. Test with a query:

    ```sh
    gemini chat "list my elasticsearch indices"
    ```

## Usage

Once installed with an active connection to the Elasticsearch MCP server, the **elasticsearch** extension automatically invokes available Tools as part of your natural language query input (where each Tool invocation is displayed as part of the CLI output response).

### Example Queries

```sh
gemini chat "show me all my elasticsearch indices"
gemini chat "search for documents about 'error' in my logs"
gemini chat "what fields are in my user-data index?"
gemini chat "show me the top 10 error codes from my logs this week"
```

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

## Troubleshooting

**If `gemini mcp list` shows "Disconnected":**
- Verify environment variables are set: `echo $ELASTIC_MCP_URL` and `echo $ELASTIC_API_KEY`
- Open a new terminal window to reload environment variables
- Check Agent Builder is enabled in Kibana
- Verify your API key hasn't expired

**Authentication errors:**
- Ensure you're using the **encoded** API key format
- Check the key has proper permissions in Kibana

For more help, see the [Elastic Community Forums](https://discuss.elastic.co/)
