export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content: string;
}

export interface AppSettings {
  provider: 'anthropic' | 'openai' | 'bedrock' | 'ollama';
  model: string;
  apiKeys: {
    anthropic?: string;
    openai?: string;
  };
  awsRegion?: string;
  ollamaHost?: string;
  theme: 'light' | 'dark' | 'system';
}

export const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ['claude-sonnet-4-6-20250514', 'claude-haiku-4-5-20251001', 'claude-opus-4-6-20250515'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o3-mini'],
  bedrock: [
    'anthropic.claude-sonnet-4-6-20250514-v1:0',
    'anthropic.claude-haiku-4-5-20251001-v1:0',
    'amazon.nova-pro-v1:0',
  ],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3'],
};

declare global {
  interface Window {
    quickCowork: {
      ping: () => Promise<string>;
      chat: {
        send: (conversationId: string, content: string) => Promise<void>;
        onStream: (callback: (chunk: StreamChunk) => void) => () => void;
        abort: () => Promise<void>;
      };
      conversations: {
        list: () => Promise<Conversation[]>;
        create: (title?: string) => Promise<Conversation>;
        delete: (id: string) => Promise<void>;
        messages: (conversationId: string) => Promise<ChatMessage[]>;
      };
      settings: {
        get: () => Promise<AppSettings>;
        set: (settings: Partial<AppSettings>) => Promise<AppSettings>;
      };
    };
  }
}
