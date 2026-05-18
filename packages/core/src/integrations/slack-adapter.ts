import { WebClient } from '@slack/web-api';
import type { SlackMessage, SlackChannel } from '@quick-cowork/shared';

export class SlackAdapter {
  private client: WebClient | null = null;

  configure(token: string): void {
    if (!token) {
      this.client = null;
      return;
    }
    this.client = new WebClient(token);
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async sendMessage(channel: string, text: string): Promise<SlackMessage> {
    if (!this.client) throw new Error('Slack not configured');
    const result = await this.client.chat.postMessage({ channel, text });
    return { channel, text, timestamp: result.ts };
  }

  async listChannels(): Promise<SlackChannel[]> {
    if (!this.client) throw new Error('Slack not configured');
    const result = await this.client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 100,
    });
    return (result.channels || [])
      .filter((c) => c.id && c.name)
      .map((c) => ({ id: c.id!, name: c.name! }));
  }

  async getMessages(channel: string, limit = 50): Promise<SlackMessage[]> {
    if (!this.client) throw new Error('Slack not configured');
    const result = await this.client.conversations.history({ channel, limit });
    return (result.messages || []).map((m) => {
      const msg = m as { text?: string; user?: string; ts?: string };
      return {
        channel,
        text: msg.text || '',
        user: msg.user,
        timestamp: msg.ts,
      };
    });
  }
}
