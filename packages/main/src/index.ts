import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
  dialog,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { IPC_CHANNELS } from '@quick-cowork/shared';
import type { ChatMessage, StreamChunk, LocalSearchOptions } from '@quick-cowork/shared';
import {
  ProviderManager,
  AppDatabase,
  ConversationStore,
  SettingsStore,
  FileService,
  generateDocument,
  getFileExtension,
  getFileFilter,
  webSearch,
  fetchUrl,
  localSearch,
  readFileContent,
} from '@quick-cowork/core';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const dataDir = path.join(app.getPath('userData'), 'data');
const database = new AppDatabase(dataDir);
const conversationStore = new ConversationStore(database.getDb());
const settingsStore = new SettingsStore(database.getDb());
const providerManager = new ProviderManager();
const fileService = new FileService();

let activeAbortController: AbortController | null = null;

function configureProviders() {
  const settings = settingsStore.get();
  providerManager.configure(settings);
  fileService.setAllowedFolders(settings.allowedFolders || []);
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
    async (_event, conversationId: string, content: string, attachmentPaths?: string[]) => {
      activeAbortController?.abort();
      activeAbortController = new AbortController();

      // Read attached files
      const attachments = [];
      if (attachmentPaths && attachmentPaths.length > 0) {
        for (const filePath of attachmentPaths) {
          const attachment = await fileService.readFile(filePath);
          if (attachment) {
            attachments.push(attachment);
          }
        }
      }

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };
      conversationStore.addMessage(conversationId, userMessage);

      const history = conversationStore.getMessages(conversationId);

      // Build chat inputs, including file content in the message
      const chatInputs = history.map((m) => {
        let msgContent = m.content;
        if (m.attachments && m.attachments.length > 0) {
          const fileContext = m.attachments
            .map((a) => `[File: ${a.name}]\n${a.content}`)
            .join('\n\n');
          msgContent = `${fileContext}\n\n${m.content}`;
        }
        return { role: m.role, content: msgContent };
      });

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

  // File access handlers
  ipcMain.handle(IPC_CHANNELS.FILE_PICK, async () => {
    if (!mainWindow) return [];

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Supported', extensions: ['txt', 'md', 'json', 'js', 'ts', 'tsx', 'jsx', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'html', 'css', 'xml', 'yaml', 'yml', 'sql', 'csv', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled) return [];

    const validPaths = result.filePaths.filter((fp) => fileService.isPathAllowed(fp));
    return validPaths;
  });

  ipcMain.handle(IPC_CHANNELS.FILE_PICK_FOLDER, async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_event, filePath: string) => {
    return fileService.readFile(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_LIST_ALLOWED, () => {
    return fileService.getAllowedFolders();
  });

  ipcMain.handle(IPC_CHANNELS.FILE_ADD_FOLDER, async () => {
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const folder = result.filePaths[0];
    fileService.addAllowedFolder(folder);

    const settings = settingsStore.get();
    const folders = settings.allowedFolders || [];
    if (!folders.includes(folder)) {
      folders.push(folder);
      settingsStore.set({ allowedFolders: folders });
    }

    return folder;
  });

  ipcMain.handle(IPC_CHANNELS.FILE_REMOVE_FOLDER, (_event, folderPath: string) => {
    fileService.removeAllowedFolder(folderPath);

    const settings = settingsStore.get();
    const folders = (settings.allowedFolders || []).filter((f) => f !== folderPath);
    settingsStore.set({ allowedFolders: folders });
  });

  // Document generation handler
  ipcMain.handle(IPC_CHANNELS.DOCUMENT_GENERATE, async (_event, request) => {
    if (!mainWindow) return { success: false, error: 'No window available' };

    try {
      const ext = getFileExtension(request.type);
      const filter = getFileFilter(request.type);

      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: `${request.title}${ext}`,
        filters: [filter],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Save cancelled' };
      }

      const buffer = await generateDocument(request);
      fs.writeFileSync(result.filePath, buffer);
      return { success: true, filePath: result.filePath };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Generation failed' };
    }
  });

  // Research handlers
  ipcMain.handle(IPC_CHANNELS.RESEARCH_WEB_SEARCH, async (_event, query: string) => {
    return webSearch(query);
  });

  ipcMain.handle(IPC_CHANNELS.RESEARCH_FETCH_URL, async (_event, url: string) => {
    return fetchUrl(url);
  });

  ipcMain.handle(
    IPC_CHANNELS.RESEARCH_LOCAL_SEARCH,
    async (_event, options: LocalSearchOptions) => {
      return localSearch(options);
    },
  );

  ipcMain.handle(IPC_CHANNELS.RESEARCH_FILE_CONTENT, (_event, filePath: string) => {
    return readFileContent(filePath);
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
  database.close();
});
