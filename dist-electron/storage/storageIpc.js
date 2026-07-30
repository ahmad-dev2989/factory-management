import { ipcMain } from 'electron';
import { saveFile, readFile, deleteFile, fileExists } from './fileService.js';
export function registerStorageIPCHandlers() {
    // Save file from base64 data URL to relative path on disk
    ipcMain.handle('file-save', async (_event, categoryFolder, originalName, base64Data) => {
        try {
            return await saveFile(categoryFolder, originalName, base64Data);
        }
        catch (err) {
            console.error('[Storage IPC] file-save error:', err);
            return {
                error: true,
                message: err.message || 'Failed to save file'
            };
        }
    });
    // Read file from disk and return as base64 data URL
    ipcMain.handle('file-read', async (_event, relativePath) => {
        try {
            return await readFile(relativePath);
        }
        catch (err) {
            console.error('[Storage IPC] file-read error:', err);
            return {
                error: true,
                message: err.message || 'Failed to read file'
            };
        }
    });
    // Delete file from disk
    ipcMain.handle('file-delete', async (_event, relativePath) => {
        try {
            return await deleteFile(relativePath);
        }
        catch (err) {
            console.error('[Storage IPC] file-delete error:', err);
            return {
                error: true,
                message: err.message || 'Failed to delete file'
            };
        }
    });
    // Check if file exists on disk
    ipcMain.handle('file-exists', async (_event, relativePath) => {
        try {
            return await fileExists(relativePath);
        }
        catch (err) {
            console.error('[Storage IPC] file-exists error:', err);
            return false;
        }
    });
}
