export const IPC_CHANNELS = {
  PING: 'app:ping',
  CHAT_SEND: 'chat:send',
  CHAT_STREAM: 'chat:stream',
  CHAT_ABORT: 'chat:abort',
  CONVERSATION_LIST: 'conversation:list',
  CONVERSATION_CREATE: 'conversation:create',
  CONVERSATION_DELETE: 'conversation:delete',
  CONVERSATION_MESSAGES: 'conversation:messages',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  RESEARCH_WEB_SEARCH: 'research:web-search',
  RESEARCH_FETCH_URL: 'research:fetch-url',
  RESEARCH_LOCAL_SEARCH: 'research:local-search',
  RESEARCH_FILE_CONTENT: 'research:file-content',
  FILE_PICK: 'file:pick',
  FILE_PICK_FOLDER: 'file:pick-folder',
  FILE_READ: 'file:read',
  FILE_LIST_ALLOWED: 'file:list-allowed',
  FILE_ADD_FOLDER: 'file:add-folder',
  FILE_REMOVE_FOLDER: 'file:remove-folder',
  DOCUMENT_GENERATE: 'document:generate',
  MEMORY_STORE: 'memory:store',
  MEMORY_SEARCH: 'memory:search',
  MEMORY_DELETE: 'memory:delete',
  MEMORY_GET_GRAPH: 'memory:get-graph',
  MEMORY_UPDATE: 'memory:update',
  MCP_CONNECT: 'mcp:connect',
  MCP_DISCONNECT: 'mcp:disconnect',
  MCP_LIST_TOOLS: 'mcp:list-tools',
  MCP_INVOKE: 'mcp:invoke',
  MCP_LIST_SERVERS: 'mcp:list-servers',
  INTEGRATION_SLACK_SEND: 'integration:slack:send',
  INTEGRATION_SLACK_CHANNELS: 'integration:slack:channels',
  INTEGRATION_GMAIL_SEND: 'integration:gmail:send',
  INTEGRATION_GMAIL_LIST: 'integration:gmail:list',
  INTEGRATION_CALENDAR_LIST: 'integration:calendar:list',
  INTEGRATION_CALENDAR_CREATE: 'integration:calendar:create',
  INTEGRATION_OAUTH_START: 'integration:oauth:start',
  INTEGRATION_OAUTH_STATUS: 'integration:oauth:status',
} as const;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  content?: string;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
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
  allowedFolders?: string[];
  embeddingProvider?: 'ollama' | 'openai';
  embeddingModel?: string;
  mcpServers?: McpServerConfig[];
  integrations?: {
    slack?: { token?: string };
    gmail?: { refreshToken?: string; clientId?: string; clientSecret?: string };
    calendar?: { refreshToken?: string; clientId?: string; clientSecret?: string };
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'ollama',
  model: 'llama3.2',
  apiKeys: {},
  ollamaHost: 'http://localhost:11434',
  theme: 'dark',
  allowedFolders: [],
};

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

// Research types
export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
}

export interface FetchUrlResponse {
  url: string;
  title: string;
  content: string;
  summary: string;
}

export interface LocalSearchResult {
  filePath: string;
  fileName: string;
  matchLine?: number;
  matchText?: string;
  size: number;
  modifiedAt: number;
}

export interface LocalSearchOptions {
  directory: string;
  pattern?: string;
  query?: string;
  maxResults?: number;
}

export interface FileContentResponse {
  filePath: string;
  content: string;
  size: number;
}

// Document generation types
export type DocumentType = 'word' | 'excel' | 'ppt';

export interface WordDocumentRequest {
  type: 'word';
  title: string;
  content: WordSection[];
}

export interface WordSection {
  heading?: string;
  paragraphs: string[];
}

export interface ExcelDocumentRequest {
  type: 'excel';
  title: string;
  sheets: ExcelSheet[];
}

export interface ExcelSheet {
  name: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface PptDocumentRequest {
  type: 'ppt';
  title: string;
  slides: PptSlide[];
}

export interface PptSlide {
  title: string;
  content: string[];
}

export type DocumentGenerateRequest =
  | WordDocumentRequest
  | ExcelDocumentRequest
  | PptDocumentRequest;

export interface DocumentGenerateResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

// Memory types
export interface Memory {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
}

export interface MemoryEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string;
  weight: number;
  createdAt: number;
}

export interface KnowledgeGraph {
  nodes: Memory[];
  edges: MemoryEdge[];
}

// MCP types
export interface McpServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpInvokeRequest {
  serverId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface McpInvokeResponse {
  content: unknown;
  isError: boolean;
}

// Integration types
export interface SlackMessage {
  channel: string;
  text: string;
  user?: string;
  timestamp?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
}

export interface GmailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  date: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  description?: string;
  location?: string;
}

export interface IntegrationStatus {
  slack: boolean;
  gmail: boolean;
  calendar: boolean;
}
