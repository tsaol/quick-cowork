import Anthropic from '@anthropic-ai/sdk';
import type { StreamChunk } from '@quick-cowork/shared';
import type { LLMProvider, ChatInput, ChatOptions } from './provider.js';

export class AnthropicProvider implements LLMProvider {
  id = 'anthropic';
  name = 'Anthropic Claude';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async *chat(messages: ChatInput[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    const client = new Anthropic({ apiKey: this.apiKey });

    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    try {
      const stream = client.messages.stream({
        model: options?.model || 'claude-sonnet-4-6-20250514',
        max_tokens: options?.maxTokens || 4096,
        system: systemMsg?.content,
        messages: chatMessages,
      });

      if (options?.signal) {
        options.signal.addEventListener('abort', () => stream.abort(), { once: true });
      }

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield { type: 'text', content: event.delta.text };
        }
      }
      yield { type: 'done', content: '' };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        yield { type: 'done', content: '' };
        return;
      }
      yield { type: 'error', content: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
