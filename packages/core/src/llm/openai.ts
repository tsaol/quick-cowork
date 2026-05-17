import OpenAI from 'openai';
import type { StreamChunk } from '@quick-cowork/shared';
import type { LLMProvider, ChatInput, ChatOptions } from './provider.js';

export class OpenAIProvider implements LLMProvider {
  id = 'openai';
  name = 'OpenAI';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async *chat(messages: ChatInput[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    const client = new OpenAI({ apiKey: this.apiKey });

    try {
      const stream = await client.chat.completions.create({
        model: options?.model || 'gpt-4o',
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        stream: true,
      });

      if (options?.signal) {
        options.signal.addEventListener('abort', () => stream.controller.abort(), { once: true });
      }

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield { type: 'text', content };
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
