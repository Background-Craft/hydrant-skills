# Connect Hydrant to Cline

Issue tracking your agents can actually use. Reads first, writes with receipts.

Hydrant runs the MCP server for you. There is no local server to build or package to install. You need a Hydrant account and access to the workspace you want Cline to use.

## Add the server

In Cline, open **MCP Servers → Remote Servers** and enter:

| Field | Value |
| --- | --- |
| Server name | `hydrant` |
| Server URL | `https://hydrant.dev/api/mcp` |
| Transport | Streamable HTTP |

Choose **Add Server**, then **Authenticate** on the installed server when Cline requests authorization. Complete OAuth in your browser: sign in to Hydrant, choose your workspace, and grant read access or read and write as needed. No API key or custom Authorization header is needed for this OAuth connection.

If you configure Cline through JSON, merge this entry into your existing `mcpServers` object; keep your other servers. If `hydrant` already exists, inspect it before changing it.

```json
{
  "mcpServers": {
    "hydrant": {
      "type": "streamableHttp",
      "url": "https://hydrant.dev/api/mcp",
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

Keep tool approvals on. A workspace grant sets the ceiling; it does not tell your agent to change anything.

## Try a read

Ask Cline:

> Use Hydrant's get_workspace tool and tell me which workspace is connected. Then list its open issues. Do not change anything.

Check the returned workspace before continuing. `get_workspace` takes `{}`. For the next call, `list_issues` accepts `{"filters":{"view":"all"},"display":{"completed":false,"direction":"asc","group":"none","order":"updated","subgroup":"none"}}` to exclude completed and canceled issues. An empty result is fine in an empty workspace; an authentication error is not a successful connection.

## Disconnect or change workspaces

Revoke the connection in Hydrant under **Settings → Agents → Access**. Removing the server from Cline does not revoke its Hydrant access. To use another workspace, revoke the old connection, clear its saved authorization in Cline, and authorize again.

If authorization does not open, check that your Cline version supports remote OAuth and that the transport is Streamable HTTP, not SSE. Do not paste browser cookies or access tokens into a chat. See [Cline's MCP configuration guide](https://docs.cline.bot/mcp/mcp-overview) and [Hydrant's connection help](https://hydrant.dev/help/agents/connect).
