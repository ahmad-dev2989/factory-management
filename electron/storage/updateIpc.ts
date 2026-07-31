import { BrowserWindow, ipcMain } from 'electron';
import { checkForUpdates, downloadUpdate, skipVersion, initializeUpdater } from './updateService.js';

export function registerUpdateIPCHandlers(mainWindow: BrowserWindow): void {
  // Initialize the updater event listeners
  initializeUpdater(mainWindow);

  // Check for updates asynchronously
  ipcMain.handle('update-check', async () => {
    try {
      return await checkForUpdates(mainWindow);
    } catch (err: any) {
      console.error('[Update IPC] update-check error:', err);
      return { updateAvailable: false }; // Fail-safe to let the app run
    }
  });

  // Start downloading the update
  ipcMain.handle('update-download', async () => {
    try {
      await downloadUpdate();
      return { success: true };
    } catch (err: any) {
      console.error('[Update IPC] update-download error:', err);
      return { error: true, message: err.message || 'Failed to download update' };
    }
  });

  // Skip the currently offered version
  ipcMain.handle('update-skip', async (_event, version: string) => {
    try {
      await skipVersion(version);
      return { success: true };
    } catch (err: any) {
      console.error('[Update IPC] update-skip error:', err);
      return { error: true };
    }
  });
}
