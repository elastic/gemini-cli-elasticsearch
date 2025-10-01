The official Elasticsearch extension for [Gemini CLI](https://github.com/google-gemini/gemini-cli).
Connects directly to an Agent Builder MCP server hosted in Elastic Cloud.

## Installing

While this repository is still private, we must clone the repository and link:

```sh
git@github.com:elastic/gemini-cli-elasticsearch.git
gemini extensions link ./gemini-cli-elasticsearch
```

## Configuring

Two environment variables are necessary to connect to your Agent Builder MCP server:

- `ELASTIC_MCP_URL`: the full URL to your hosted MCP server
- `ELASTIC_API_KEY`: the API key for your hosted MCP server

Wth Agent Builder enabled in your Kibana instance, the MCP server's URL will be found in the Kibana Agent Builder UI by going to **Agents > Manage tools > MCP Server**.

The API key should be a [standard Elasticsearch API key](https://www.elastic.co/docs/deploy-manage/api-keys/elasticsearch-api-keys).
