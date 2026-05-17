import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, StreamChunk } from '@quick-cowork/shared';

const api = {
  ping: (): Promise<string> => ipcRenderer.invoke(IPC_CHANNELS.PING),

  chat: {
    send: (message: string): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.CHAT_SEND, message),
    onStream: (callback: (chunk: StreamChunk) => void) => {
      const listener = (_event: unknown, chunk: StreamChunk) => callback(chunk);
      ipcRenderer.on(IPC_CHANNELS.CHAT_STREAM, listener);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.CHAT_STREAM, listener);
    },
    abort: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.CHAT_ABORT),
  },

  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (settings: Record<string, unknown>) =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, settings),
  },

  file: {
    pick: () => ipcRenderer.invoke(IPC_CHANNELS.FILE_PICK),
    read: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.FILE_READ, path),
  },
};

export type QuickCoworkAPI = typeof api;

contextBridge.exposeInMainWorld('quickCowork', api);
