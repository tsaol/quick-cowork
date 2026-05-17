import type { StreamChunk } from '@quick-cowork/shared';
import type { LLMProvider, ChatInput, ChatOptions } from './provider.js';

export class OllamaProvider implements LLMProvider {
  id = 'ollama';
  name = 'Ollama (Local)';
  private host: string;

  constructor(host?: string) {
    this.host = host || 'http://localhost:11434';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.host}/api/tags`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async *chat(messages: ChatInput[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    try {
      const res = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options?.model || 'llama3.2',
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        yield { type: 'error', content: `Ollama error: ${res.status} ${res.statusText}` };
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        yield { type: 'error', content: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.message?.content) {
              yield { type: 'text', content: json.message.content };
            }
          } catch {
            // skip malformed lines
          }
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
