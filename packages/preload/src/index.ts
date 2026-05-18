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
} from '@quick-cowork/shared';

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
};

export type QuickCoworkAPI = typeof api;

contextBridge.exposeInMainWorld('quickCowork', api);
