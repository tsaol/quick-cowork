import { McpClient } from './mcp-client.js';
import { SlackAdapter } from './slack-adapter.js';
import { GmailAdapter } from './gmail-adapter.js';
import { CalendarAdapter } from './calendar-adapter.js';
import type {
  AppSettings,
  McpServerConfig,
  IntegrationStatus,
  McpInvokeResponse,
} from '@quick-cowork/shared';

export class IntegrationManager {
  public readonly mcp: McpClient;
  public readonly slack: SlackAdapter;
  public readonly gmail: GmailAdapter;
  public readonly calendar: CalendarAdapter;

  constructor() {
    this.mcp = new McpClient();
    this.slack = new SlackAdapter();
    this.gmail = new GmailAdapter();
    this.calendar = new CalendarAdapter();
  }

  configureFromSettings(settings: AppSettings): void {
    const slackToken = settings.integrations?.slack?.token;
    if (slackToken) {
      this.slack.configure(slackToken);
    }
    const gmail = settings.integrations?.gmail;
    if (gmail?.clientId && gmail?.clientSecret && gmail?.refreshToken) {
      this.gmail.configure(gmail.clientId, gmail.clientSecret, gmail.refreshToken);
    }
    const cal = settings.integrations?.calendar;
    if (cal?.clientId && cal?.clientSecret && cal?.refreshToken) {
      this.calendar.configure(cal.clientId, cal.clientSecret, cal.refreshToken);
    }
  }

  async connectMcpServers(servers: McpServerConfig[]): Promise<void> {
    for (const server of servers) {
      try {
        await this.mcp.connect(server);
      } catch (err) {
        console.error(`Failed to connect MCP server ${server.id}:`, err);
      }
    }
  }

  getStatus(): IntegrationStatus {
    return {
      slack: this.slack.isConfigured(),
      gmail: this.gmail.isConfigured(),
      calendar: this.calendar.isConfigured(),
    };
  }

  /**
   * Find an MCP server (id) that provides a tool with the given name.
   * Returns the first match, or null if no connected MCP server exposes it.
   */
  async findMcpToolProvider(toolName: string): Promise<string | null> {
    for (const serverId of this.mcp.listServers()) {
      try {
        const tools = await this.mcp.listTools(serverId);
        if (tools.some((t) => t.name === toolName)) {
          return serverId;
        }
      } catch {
        // skip servers that fail to list tools
      }
    }
    return null;
  }

  /**
   * Invoke a tool by name. If a connected MCP server provides a tool with
   * that name, route through MCP. Otherwise fall back to the direct adapter
   * action specified by `fallback`.
   */
  async invokeTool<T>(
    toolName: string,
    args: Record<string, unknown>,
    fallback: () => Promise<T>,
  ): Promise<McpInvokeResponse | T> {
    const serverId = await this.findMcpToolProvider(toolName);
    if (serverId) {
      return this.mcp.invoke(serverId, toolName, args);
    }
    return fallback();
  }

  async cleanup(): Promise<void> {
    await this.mcp.disconnectAll();
  }
}
