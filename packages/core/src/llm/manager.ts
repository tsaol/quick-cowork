import type { AppSettings, StreamChunk } from '@quick-cowork/shared';
import type { LLMProvider, ChatInput, ChatOptions } from './provider.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { BedrockProvider } from './bedrock.js';
import { OllamaProvider } from './ollama.js';

export class ProviderManager {
  private providers = new Map<string, LLMProvider>();

  configure(settings: AppSettings): void {
    this.providers.clear();

    if (settings.apiKeys.anthropic) {
      this.providers.set('anthropic', new AnthropicProvider(settings.apiKeys.anthropic));
    }

    if (settings.apiKeys.openai) {
      this.providers.set('openai', new OpenAIProvider(settings.apiKeys.openai));
    }

    this.providers.set('bedrock', new BedrockProvider(settings.awsRegion));
    this.providers.set('ollama', new OllamaProvider(settings.ollamaHost));
  }

  get(id: string): LLMProvider | undefined {
    return this.providers.get(id);
  }

  async getAvailable(): Promise<LLMProvider[]> {
    const results: LLMProvider[] = [];
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        results.push(provider);
      }
    }
    return results;
  }

  async *chat(
    providerId: string,
    messages: ChatInput[],
    options?: ChatOptions,
  ): AsyncIterable<StreamChunk> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      yield { type: 'error', content: `Provider "${providerId}" not configured` };
      return;
    }
    yield* provider.chat(messages, options);
  }
}
