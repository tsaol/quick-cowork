import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
} from 'electron';
import path from 'node:path';
import { IPC_CHANNELS } from '@quick-cowork/shared';
import type { ChatMessage, StreamChunk } from '@quick-cowork/shared';
import { ProviderManager, ConversationStore, SettingsStore } from '@quick-cowork/core';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const dataDir = path.join(app.getPath('userData'), 'data');
const conversationStore = new ConversationStore(dataDir);
const settingsStore = new SettingsStore(dataDir);
const providerManager = new ProviderManager();

let activeAbortController: AbortController | null = null;

function configureProviders() {
  providerManager.configure(settingsStore.get());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#09090b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../../preload/dist/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin') {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setTitle('QC');
  tray.setToolTip('Quick Cowork');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Quick Cowork',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createWindow();
    }
  });
}

function sendStream(chunk: StreamChunk) {
  mainWindow?.webContents.send(IPC_CHANNELS.CHAT_STREAM, chunk);
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.PING, () => 'pong');

  ipcMain.handle(
    IPC_CHANNELS.CHAT_SEND,
    async (_event, conversationId: string, content: string) => {
      activeAbortController?.abort();
      activeAbortController = new AbortController();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      conversationStore.addMessage(conversationId, userMessage);

      const history = conversationStore.getMessages(conversationId);
      const chatInputs = history.map((m) => ({ role: m.role, content: m.content }));

      const settings = settingsStore.get();
      let fullResponse = '';

      try {
        for await (const chunk of providerManager.chat(settings.provider, chatInputs, {
          model: settings.model,
          signal: activeAbortController.signal,
        })) {
          sendStream(chunk);
          if (chunk.type === 'text') {
            fullResponse += chunk.content;
          }
        }
      } catch {
        sendStream({ type: 'error', content: 'Stream interrupted' });
      }

      if (fullResponse) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullResponse,
          timestamp: Date.now(),
        };
        conversationStore.addMessage(conversationId, assistantMessage);
      }

      activeAbortController = null;
    },
  );

  ipcMain.handle(IPC_CHANNELS.CHAT_ABORT, () => {
    activeAbortController?.abort();
    activeAbortController = null;
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATION_LIST, () => {
    return conversationStore.listConversations();
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATION_CREATE, (_event, title: string) => {
    return conversationStore.createConversation(title || 'New Chat');
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATION_DELETE, (_event, id: string) => {
    conversationStore.deleteConversation(id);
  });

  ipcMain.handle(IPC_CHANNELS.CONVERSATION_MESSAGES, (_event, conversationId: string) => {
    return conversationStore.getMessages(conversationId);
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return settingsStore.get();
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_event, partial: Record<string, unknown>) => {
    const updated = settingsStore.set(partial);
    configureProviders();
    return updated;
  });
}

app.whenReady().then(() => {
  configureProviders();
  createWindow();
  createTray();
  registerIpcHandlers();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // stay in tray on macOS
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
