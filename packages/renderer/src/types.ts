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
  provider: 'anthropic' | 'openai' | 'bedrock' | 'ollama' | 'litellm';
  model: string;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    litellm?: string;
  };
  awsRegion?: string;
  ollamaHost?: string;
  litellmBaseUrl?: string;
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
  litellm: ['gpt-4o', 'claude-sonnet-4-6-20250514', 'claude-haiku-4-5-20251001', 'mistral-large-latest'],
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

// Custom agents
export interface AgentDefinition {
  id: string;
  name: string;
  instructions: string;
  tools: string[];
  model?: string;
  temperature?: number;
  createdAt: number;
  updatedAt: number;
}

export type AgentInput = Omit<AgentDefinition, 'id' | 'createdAt' | 'updatedAt'>;

export interface AgentExecutionResult {
  agentId: string;
  output: string;
  toolCalls: { tool: string; input: Record<string, unknown>; output: unknown }[];
  duration: number;
}

// Spaces (collaborative workspaces)
export interface Space {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: SpaceMember[];
  createdAt: number;
  updatedAt: number;
}

export interface SpaceMember {
  id: string;
  name: string;
  role: 'owner' | 'editor' | 'viewer';
  online: boolean;
  lastSeen: number;
}

export interface SpaceMessage {
  id: string;
  spaceId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'ai_response' | 'system';
  timestamp: number;
}

export interface SpaceInvite {
  spaceId: string;
  email: string;
  role: 'editor' | 'viewer';
}

export interface SyncState {
  lastSyncAt: number;
  pendingChanges: number;
  connected: boolean;
}

// Briefing
export interface BriefingConfig {
  enabled: boolean;
  time: string;
  includeCalendar: boolean;
  includeGmail: boolean;
  includeMemories: boolean;
}

export interface BriefingSection {
  title: string;
  items: string[];
  source: 'calendar' | 'gmail' | 'memory';
}

export interface DailyBriefing {
  id: string;
  date: string;
  summary: string;
  sections: BriefingSection[];
  generatedAt: number;
}

// Workflows (M9)
export interface ScheduleTriggerConfig {
  cron: string;
  time?: string;
}

export interface EventTriggerConfig {
  source: 'email' | 'calendar' | 'slack';
  condition: string;
}

export interface WorkflowTrigger {
  type: 'schedule' | 'event';
  config: ScheduleTriggerConfig | EventTriggerConfig;
}

export type WorkflowActionType =
  | 'send_slack'
  | 'send_email'
  | 'generate_doc'
  | 'ai_process'
  | 'save_memory';

export interface WorkflowAction {
  id: string;
  type: WorkflowActionType;
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowActionResult {
  actionId: string;
  output: unknown;
  error?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  status: 'success' | 'failed' | 'running';
  startedAt: number;
  completedAt?: number;
  results: WorkflowActionResult[];
}

export interface WorkflowCreateInput {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled?: boolean;
}

export interface WorkflowUpdateInput {
  name?: string;
  description?: string;
  trigger?: WorkflowTrigger;
  actions?: WorkflowAction[];
  enabled?: boolean;
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
      agents: {
        create: (def: AgentInput) => Promise<AgentDefinition>;
        update: (id: string, def: Partial<AgentInput>) => Promise<AgentDefinition>;
        delete: (id: string) => Promise<void>;
        list: () => Promise<AgentDefinition[]>;
        get: (id: string) => Promise<AgentDefinition | null>;
        execute: (agentId: string, message: string) => Promise<AgentExecutionResult>;
      };
      spaces: {
        create: (name: string, description: string) => Promise<Space>;
        join: (spaceId: string, role?: 'editor' | 'viewer') => Promise<Space | null>;
        leave: (spaceId: string) => Promise<void>;
        list: () => Promise<Space[]>;
        get: (spaceId: string) => Promise<Space | null>;
        invite: (
          spaceId: string,
          email: string,
          role: 'editor' | 'viewer',
        ) => Promise<SpaceMember | null>;
        members: (spaceId: string) => Promise<SpaceMember[]>;
        messages: (spaceId: string) => Promise<SpaceMessage[]>;
        send: (
          spaceId: string,
          content: string,
          type?: SpaceMessage['type'],
        ) => Promise<SpaceMessage>;
        sync: (spaceId: string) => Promise<SyncState>;
      };
      briefing: {
        generate: () => Promise<DailyBriefing>;
        getLatest: () => Promise<DailyBriefing | null>;
        configure: (config: BriefingConfig) => Promise<BriefingConfig>;
        getConfig: () => Promise<BriefingConfig>;
      };
      workflows: {
        list: () => Promise<Workflow[]>;
        get: (id: string) => Promise<Workflow | null>;
        create: (input: WorkflowCreateInput) => Promise<Workflow>;
        update: (id: string, input: WorkflowUpdateInput) => Promise<Workflow>;
        delete: (id: string) => Promise<void>;
        execute: (id: string) => Promise<WorkflowRun>;
        toggle: (id: string, enabled: boolean) => Promise<Workflow>;
        history: (id: string, limit?: number) => Promise<WorkflowRun[]>;
      };
    };
  }
}
