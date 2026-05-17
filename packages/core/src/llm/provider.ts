import { StreamChunk } from '@quick-cowork/shared';

export interface LLMProvider {
  id: string;
  name: string;
  models: string[];
  chat(messages: ChatInput[], options?: ChatOptions): AsyncIterable<StreamChunk>;
  isAvailable(): Promise<boolean>;
}

export interface ChatInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}
