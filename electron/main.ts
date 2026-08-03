import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { initializeDatabase, closeDatabase } from './database/database.js';
import { registerDatabaseIPCHandlers } from './database/ipc.js';
import { registerStorageIPCHandlers } from './storage/storageIpc.js';
import { registerBackupIPCHandlers } from './storage/backupIpc.js';
import { registerUpdateIPCHandlers } from './storage/updateIpc.js';
import {
  logMessage,
  getLogs,
  clearLogs,
  exportLogs,
  getDatabaseDiagnostics,
  optimizeDatabase,
  cleanupTemporaryStorage
} from './storage/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

function createWindow(state: WindowState) {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const iconPath = isDev
    ? path.join(__dirname, '../public/app-icons/icon.png')
    : path.join(__dirname, '../dist/app-icons/icon.png');

  mainWindow = new BrowserWindow({
    title: 'Factory App',
    icon: iconPath,
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 1280,
    minHeight: 720,
    center: state.x === undefined,
    resizable: true,
    maximizable: true,
    backgroundColor: '#ffffff',
    frame: true, // Native Windows Title Bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false, // Required for ESM imports in preload
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Prevent renderer from overriding the native window title
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });

  const saveState = async () => {
    try {
      if (!mainWindow) return;
      const bounds = mainWindow.getBounds();
      const statePath = path.join(app.getPath('userData'), 'window-state.json');
      await fs.writeFile(
        statePath,
        JSON.stringify({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }),
        'utf8'
      );
    } catch (err) {
      console.error('[Main] Failed to save window state:', err);
    }
  };

  mainWindow.on('resize', saveState);
  mainWindow.on('move', saveState);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  logMessage('INFO', 'System', 'Application launched.');
  try {
    await initializeDatabase();
    logMessage('INFO', 'Database', 'Database startup initialization complete.');
  } catch (error: any) {
    logMessage('ERROR', 'Database', `Critical database initialization failure on startup: ${error.message}`);
  }

  registerDatabaseIPCHandlers();
  registerStorageIPCHandlers();

  // Load saved window state bounds
  let windowState: WindowState = { width: 1280, height: 720 };
  try {
    const statePath = path.join(app.getPath('userData'), 'window-state.json');
    const stateData = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(stateData);
    if (parsed.width && parsed.height) {
      windowState = parsed;
    }
  } catch (err) {
    // Fail silently when settings file is absent
  }

  createWindow(windowState);
  registerBackupIPCHandlers(mainWindow!);
  registerUpdateIPCHandlers(mainWindow!);

  // Register logger / diagnostics / storage cleanup handlers
  ipcMain.handle('get-logs', () => {
    return getLogs();
  });

  ipcMain.handle('clear-logs', () => {
    return clearLogs();
  });

  ipcMain.handle('export-logs', () => {
    return exportLogs(mainWindow);
  });

  ipcMain.handle('db-diagnostics', () => {
    return getDatabaseDiagnostics();
  });

  ipcMain.handle('db-vacuum', () => {
    return optimizeDatabase();
  });

  ipcMain.handle('storage-cleanup', () => {
    return cleanupTemporaryStorage();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(windowState);
    }
  });
});

app.on('window-all-closed', () => {
  logMessage('INFO', 'System', 'All windows closed. Quitting application.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  closeDatabase();
});

ipcMain.handle('get-app-version', async () => {
  try {
    const packageJsonPath = path.join(app.getAppPath(), 'package.json');
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    return pkg.version || '1.0.0';
  } catch (err) {
    console.error('[Main] Failed to get app version:', err);
    return '1.0.0';
  }
});

ipcMain.handle('get-wifi-ssid', async () => {
  try {
    if (process.platform === 'win32') {
      const output = execSync('netsh wlan show interfaces', { encoding: 'utf8', timeout: 5000 });
      const match = output.match(/^\s*SSID\s*:\s*(.+)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    } else if (process.platform === 'darwin') {
      const output = execSync('/System/Library/PrivateFrameworks/Apple80211.framework/Resources/airport -I', { encoding: 'utf8', timeout: 5000 });
      const match = output.match(/^\s*SSID:\s*(.+)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    } else {
      const output = execSync('nmcli -t -f active,ssid dev wifi', { encoding: 'utf8', timeout: 5000 });
      const match = output.match(/^yes:(.+)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  } catch (err) {
    console.error('[Main] Failed to get WiFi SSID:', err);
    return null;
  }
});

