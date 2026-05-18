import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@quick-cowork/shared';
import type {
  StreamChunk,
  Conversation,
  ChatMessage,
  AppSettings,
  FileAttachment,
  DocumentGenerateRequest,
  DocumentGenerateResponse,
  WebSearchResponse,
  FetchUrlResponse,
  LocalSearchResult,
  LocalSearchOptions,
  FileContentResponse,
  Memory,
  MemorySearchResult,
  KnowledgeGraph,
  McpServerConfig,
  McpTool,
  McpInvokeResponse,
  SlackMessage,
  SlackChannel,
  GmailMessage,
  CalendarEvent,
  IntegrationStatus,
  AgentDefinition,
  AgentExecutionResult,
  Space,
  SpaceMember,
  SpaceMessage,
  SyncState,
  BriefingConfig,
  DailyBriefing,
  Workflow,
  WorkflowAction,
  WorkflowTrigger,
  WorkflowRun,
} from '@quick-cowork/shared';

type AgentInput = Omit<AgentDefinition, 'id' | 'createdAt' | 'updatedAt'>;

interface WorkflowCreateInput {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled?: boolean;
}

interface WorkflowUpdateInput {
  name?: string;
  description?: string;
  trigger?: WorkflowTrigger;
  actions?: WorkflowAction[];
  enabled?: boolean;
}

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.PING),

  chat: {
    send: (conversationId: string, content: string, attachmentPaths?: string[]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, conversationId, content, attachmentPaths),
    onStream: (callback: (chunk: StreamChunk) => void) => {
      const listener = (_event: unknown, chunk: StreamChunk) => callback(chunk);
      ipcRenderer.on(IPC_CHANNELS.CHAT_STREAM, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.CHAT_STREAM, listener);
    },
    abort: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.CHAT_ABORT),
  },

  conversations: {
    list: (): Promise<Conversation[]> => ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_LIST),
    create: (title?: string): Promise<Conversation> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_CREATE, title),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_DELETE, id),
    messages: (conversationId: string): Promise<ChatMessage[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.CONVERSATION_MESSAGES, conversationId),
  },

  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (settings: Partial<AppSettings>): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  },

  files: {
    pick: (): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.FILE_PICK),
    pickFolder: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.FILE_PICK_FOLDER),
    read: (filePath: string): Promise<FileAttachment | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, filePath),
    listAllowed: (): Promise<string[]> => ipcRenderer.invoke(IPC_CHANNELS.FILE_LIST_ALLOWED),
    addFolder: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.FILE_ADD_FOLDER),
    removeFolder: (folderPath: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.FILE_REMOVE_FOLDER, folderPath),
  },

  documents: {
    generate: (request: DocumentGenerateRequest): Promise<DocumentGenerateResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCUMENT_GENERATE, request),
  },

  research: {
    webSearch: (query: string): Promise<WebSearchResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.RESEARCH_WEB_SEARCH, query),
    fetchUrl: (url: string): Promise<FetchUrlResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.RESEARCH_FETCH_URL, url),
    localSearch: (options: LocalSearchOptions): Promise<LocalSearchResult[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.RESEARCH_LOCAL_SEARCH, options),
    fileContent: (filePath: string): Promise<FileContentResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.RESEARCH_FILE_CONTENT, filePath),
  },

  memory: {
    store: (content: string, metadata?: Record<string, unknown>): Promise<Memory> =>
      ipcRenderer.invoke(IPC_CHANNELS.MEMORY_STORE, content, metadata),
    search: (query: string, limit?: number): Promise<MemorySearchResult[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.MEMORY_SEARCH, query, limit),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.MEMORY_DELETE, id),
    getGraph: (): Promise<KnowledgeGraph> =>
      ipcRenderer.invoke(IPC_CHANNELS.MEMORY_GET_GRAPH),
    update: (
      id: string,
      content: string,
      metadata?: Record<string, unknown>,
    ): Promise<Memory> =>
      ipcRenderer.invoke(IPC_CHANNELS.MEMORY_UPDATE, id, content, metadata),
  },

  mcp: {
    connect: (config: McpServerConfig): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_CONNECT, config),
    disconnect: (serverId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_DISCONNECT, serverId),
    listTools: (serverId: string): Promise<McpTool[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_LIST_TOOLS, serverId),
    invoke: (
      serverId: string,
      toolName: string,
      args: Record<string, unknown>,
    ): Promise<McpInvokeResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_INVOKE, serverId, toolName, args),
    listServers: (): Promise<McpServerConfig[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.MCP_LIST_SERVERS),
  },

  integrations: {
    slackSend: (channel: string, text: string): Promise<SlackMessage> =>
      ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_SLACK_SEND, channel, text),
    slackChannels: (): Promise<SlackChannel[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_SLACK_CHANNELS),
    gmailSend: (to: string, subject: string, body: string): Promise<GmailMessage> =>
      ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_GMAIL_SEND, to, subject, body),
    gmailList: (query?: string, max?: number): Promise<GmailMessage[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_GMAIL_LIST, query, max),
    calendarList: (timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_CALENDAR_LIST, timeMin, timeMax),
    calendarCreate: (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> =>
      ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_CALENDAR_CREATE, event),
    oauthStart: (provider: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_OAUTH_START, provider),
    oauthStatus: (): Promise<IntegrationStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.INTEGRATION_OAUTH_STATUS),
  },

  agents: {
    create: (def: AgentInput): Promise<AgentDefinition> =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_CREATE, def),
    update: (id: string, def: Partial<AgentInput>): Promise<AgentDefinition> =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_UPDATE, id, def),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_DELETE, id),
    list: (): Promise<AgentDefinition[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_LIST),
    get: (id: string): Promise<AgentDefinition | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_GET, id),
    execute: (agentId: string, message: string): Promise<AgentExecutionResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.AGENT_EXECUTE, agentId, message),
  },

  spaces: {
    create: (name: string, description: string): Promise<Space> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_CREATE, name, description),
    join: (spaceId: string, role?: 'editor' | 'viewer'): Promise<Space | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_JOIN, spaceId, role),
    leave: (spaceId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_LEAVE, spaceId),
    list: (): Promise<Space[]> => ipcRenderer.invoke(IPC_CHANNELS.SPACE_LIST),
    get: (spaceId: string): Promise<Space | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_GET, spaceId),
    invite: (
      spaceId: string,
      email: string,
      role: 'editor' | 'viewer',
    ): Promise<SpaceMember | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_INVITE, spaceId, email, role),
    members: (spaceId: string): Promise<SpaceMember[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_MEMBERS, spaceId),
    messages: (spaceId: string): Promise<SpaceMessage[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_MESSAGES, spaceId),
    send: (
      spaceId: string,
      content: string,
      type?: SpaceMessage['type'],
    ): Promise<SpaceMessage> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_SEND, spaceId, content, type),
    sync: (spaceId: string): Promise<SyncState> =>
      ipcRenderer.invoke(IPC_CHANNELS.SPACE_SYNC, spaceId),
  },

  briefing: {
    generate: (): Promise<DailyBriefing> =>
      ipcRenderer.invoke(IPC_CHANNELS.BRIEFING_GENERATE),
    getLatest: (): Promise<DailyBriefing | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.BRIEFING_GET_LATEST),
    configure: (config: BriefingConfig): Promise<BriefingConfig> =>
      ipcRenderer.invoke(IPC_CHANNELS.BRIEFING_CONFIGURE, config),
    getConfig: (): Promise<BriefingConfig> =>
      ipcRenderer.invoke(IPC_CHANNELS.BRIEFING_GET_CONFIG),
  },

  workflows: {
    list: (): Promise<Workflow[]> => ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_LIST),
    get: (id: string): Promise<Workflow | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_GET, id),
    create: (input: WorkflowCreateInput): Promise<Workflow> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_CREATE, input),
    update: (id: string, input: WorkflowUpdateInput): Promise<Workflow> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_UPDATE, id, input),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_DELETE, id),
    execute: (id: string): Promise<WorkflowRun> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_EXECUTE, id),
    toggle: (id: string, enabled: boolean): Promise<Workflow> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_TOGGLE, id, enabled),
    history: (id: string, limit?: number): Promise<WorkflowRun[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKFLOW_HISTORY, id, limit),
  },
};

export type QuickCoworkAPI = typeof api;

contextBridge.exposeInMainWorld('quickCowork', api);
