import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { StreamChunk } from '@quick-cowork/shared';
import type { LLMProvider, ChatInput, ChatOptions } from './provider.js';

export class BedrockProvider implements LLMProvider {
  id = 'bedrock';
  name = 'AWS Bedrock';
  private region: string;

  constructor(region?: string) {
    this.region = region || 'us-east-1';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const client = new BedrockRuntimeClient({ region: this.region });
      await client.config.credentials();
      return true;
    } catch {
      return false;
    }
  }

  async *chat(messages: ChatInput[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    const client = new BedrockRuntimeClient({ region: this.region });

    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: [{ text: m.content }],
      }));

    try {
      const command = new ConverseStreamCommand({
        modelId: options?.model || 'anthropic.claude-sonnet-4-6-20250514-v1:0',
        system: systemMsg ? [{ text: systemMsg.content }] : undefined,
        messages: chatMessages,
        inferenceConfig: {
          maxTokens: options?.maxTokens || 4096,
          temperature: options?.temperature,
        },
      });

      const response = await client.send(command, {
        abortSignal: options?.signal,
      });

      if (response.stream) {
        for await (const event of response.stream) {
          if (event.contentBlockDelta?.delta?.text) {
            yield { type: 'text', content: event.contentBlockDelta.delta.text };
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
