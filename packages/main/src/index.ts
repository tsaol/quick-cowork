import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import path from 'path';
import { IPC_CHANNELS } from '@quick-cowork/shared';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../../preload/dist/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Quick Cowork');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Quick Cowork', click: () => mainWindow?.show() || createWindow() },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show() || createWindow());
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.PING, () => 'pong');

  ipcMain.handle(IPC_CHANNELS.CHAT_SEND, async (_event, message: string) => {
    // TODO: route to LLM provider
    if (mainWindow) {
      mainWindow.webContents.send(IPC_CHANNELS.CHAT_STREAM, {
        type: 'text',
        content: `Echo: ${message}`,
      });
      mainWindow.webContents.send(IPC_CHANNELS.CHAT_STREAM, {
        type: 'done',
        content: '',
      });
    }
  });

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, () => {
    return { provider: 'anthropic', model: 'claude-sonnet-4-6', theme: 'system' };
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Keep running in tray on macOS
});
