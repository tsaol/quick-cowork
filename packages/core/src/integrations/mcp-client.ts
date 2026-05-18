import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { McpServerConfig, McpTool, McpInvokeResponse } from '@quick-cowork/shared';

export class McpClient {
  private clients: Map<string, Client> = new Map();

  async connect(config: McpServerConfig): Promise<void> {
    if (this.clients.has(config.id)) {
      await this.disconnect(config.id);
    }
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env,
    });
    const client = new Client(
      { name: 'quick-cowork', version: '0.1.0' },
      { capabilities: {} },
    );
    await client.connect(transport);
    this.clients.set(config.id, client);
  }

  async disconnect(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      await client.close();
      this.clients.delete(serverId);
    }
  }

  async listTools(serverId: string): Promise<McpTool[]> {
    const client = this.clients.get(serverId);
    if (!client) throw new Error(`MCP server ${serverId} not connected`);
    const result = await client.listTools();
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description || '',
      inputSchema: (t.inputSchema as Record<string, unknown>) || {},
    }));
  }

  async invoke(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<McpInvokeResponse> {
    const client = this.clients.get(serverId);
    if (!client) throw new Error(`MCP server ${serverId} not connected`);
    try {
      const result = await client.callTool({ name: toolName, arguments: args });
      return { content: result.content, isError: !!result.isError };
    } catch (err) {
      return { content: err instanceof Error ? err.message : String(err), isError: true };
    }
  }

  listServers(): string[] {
    return Array.from(this.clients.keys());
  }

  async disconnectAll(): Promise<void> {
    const ids = Array.from(this.clients.keys());
    for (const id of ids) {
      try {
        await this.disconnect(id);
      } catch {
        // ignore individual disconnect errors during cleanup
      }
    }
  }
}
