export const IPC_CHANNELS = {
  PING: 'app:ping',
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream',
  CHAT_ABORT: 'chat:abort',
  CHAT_HISTORY: 'chat:history',
  MEMORY_SEARCH: 'memory:search',
  FILE_READ: 'file:read',
  FILE_PICK: 'file:pick',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  BRIEFING_GENERATE: 'briefing:generate',
} as const;

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
  provider: 'anthropic' | 'openai' | 'bedrock';
  model: string;
  apiKeys: {
    anthropic?: string;
    openai?: string;
  };
  theme: 'light' | 'dark' | 'system';
}
