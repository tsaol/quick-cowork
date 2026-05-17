import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@quick-cowork/shared';
import type { StreamChunk, Conversation, ChatMessage, AppSettings } from '@quick-cowork/shared';

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.PING),

  chat: {
    send: (conversationId: string, content: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, conversationId, content),
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
};

export type QuickCoworkAPI = typeof api;

contextBridge.exposeInMainWorld('quickCowork', api);
