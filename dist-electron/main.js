import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
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
app.whenReady().then(() => {
    createWindow();
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
// Setup future-proof IPC handlers for database, file storage, and printing
ipcMain.handle('db-query', async (event, query, params) => {
    console.log(`[IPC] db-query: ${query}`);
    return { success: true, message: 'SQLite Placeholder' };
});
ipcMain.handle('file-save', async (event, filePath, content) => {
    console.log(`[IPC] file-save: ${filePath}`);
    return { success: true };
});
ipcMain.handle('file-read', async (event, filePath) => {
    console.log(`[IPC] file-read: ${filePath}`);
    return { success: true, content: '' };
});
