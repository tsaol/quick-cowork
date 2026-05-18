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

export interface WordSection {
  heading?: string;
  paragraphs: string[];
}

export interface ExcelSheet {
  name: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface PptSlide {
  title: string;
  content: string[];
}

export interface WordDocumentRequest {
  type: 'word';
  title: string;
  content: WordSection[];
}

export interface ExcelDocumentRequest {
  type: 'excel';
  title: string;
  sheets: ExcelSheet[];
}

export interface PptDocumentRequest {
  type: 'ppt';
  title: string;
  slides: PptSlide[];
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

declare global {
  interface Window {
    quickCowork: {
      ping: () => Promise<string>;
      chat: {
        send: (conversationId: string, content: string, attachmentPaths?: string[]) => Promise<void>;
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
      files: {
        pick: () => Promise<string[]>;
        pickFolder: () => Promise<string | null>;
        read: (filePath: string) => Promise<FileAttachment | null>;
        listAllowed: () => Promise<string[]>;
        addFolder: () => Promise<string | null>;
        removeFolder: (folderPath: string) => Promise<void>;
      };
      documents: {
        generate: (request: DocumentGenerateRequest) => Promise<DocumentGenerateResponse>;
      };
      research: {
        webSearch: (query: string) => Promise<WebSearchResponse>;
        fetchUrl: (url: string) => Promise<FetchUrlResponse>;
        localSearch: (options: LocalSearchOptions) => Promise<LocalSearchResult[]>;
        fileContent: (filePath: string) => Promise<FileContentResponse>;
      };
      memory: {
        store: (content: string, metadata?: Record<string, unknown>) => Promise<Memory>;
        search: (query: string, limit?: number) => Promise<MemorySearchResult[]>;
        delete: (id: string) => Promise<void>;
        getGraph: () => Promise<KnowledgeGraph>;
        update: (
          id: string,
          content: string,
          metadata?: Record<string, unknown>,
        ) => Promise<Memory>;
      };
      mcp: {
        connect: (config: McpServerConfig) => Promise<void>;
        disconnect: (serverId: string) => Promise<void>;
        listTools: (serverId: string) => Promise<McpTool[]>;
        invoke: (
          serverId: string,
          toolName: string,
          args: Record<string, unknown>,
        ) => Promise<McpInvokeResponse>;
        listServers: () => Promise<McpServerConfig[]>;
      };
      integrations: {
        slackSend: (channel: string, text: string) => Promise<SlackMessage>;
        slackChannels: () => Promise<SlackChannel[]>;
        gmailSend: (to: string, subject: string, body: string) => Promise<GmailMessage>;
        gmailList: (query?: string, max?: number) => Promise<GmailMessage[]>;
        calendarList: (timeMin?: string, timeMax?: string) => Promise<CalendarEvent[]>;
        calendarCreate: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>;
        oauthStart: (provider: string) => Promise<void>;
        oauthStatus: () => Promise<IntegrationStatus>;
      };
    };
  }
}
