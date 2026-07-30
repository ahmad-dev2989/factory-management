import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initializeDatabase, closeDatabase } from './database/database.js';
import { registerDatabaseIPCHandlers } from './database/ipc.js';
import { registerStorageIPCHandlers } from './storage/storageIpc.js';
import { registerBackupIPCHandlers } from './storage/backupIpc.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow = null;
function createWindow() {
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const iconPath = isDev
        ? path.join(__dirname, '../public/app-icons/icon.png')
        : path.join(__dirname, '../dist/app-icons/icon.png');
    mainWindow = new BrowserWindow({
        title: 'Factory Management & Accounting System',
        icon: iconPath,
        width: 1280,
        height: 720,
        minWidth: 1280,
        minHeight: 720,
        center: true,
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
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    // Prevent renderer from overriding the native window title
    mainWindow.on('page-title-updated', (e) => {
        e.preventDefault();
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
app.whenReady().then(async () => {
    try {
        await initializeDatabase();
        console.log('[Database] Database startup initialization complete.');
    }
    catch (error) {
        console.error('[Database] Critical database initialization failure on startup:', error);
    }
    registerDatabaseIPCHandlers();
    registerStorageIPCHandlers();
    createWindow();
    registerBackupIPCHandlers(mainWindow);
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('will-quit', () => {
    closeDatabase();
});
