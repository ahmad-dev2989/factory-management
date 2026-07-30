import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { closeDatabase, initializeDatabase } from '../database/database.js';
import { createBackupZip, validateBackupZip, applyRestore, rollbackRestore } from './backupService.js';

let pendingExtractPath = '';

export function registerBackupIPCHandlers(mainWindow: BrowserWindow): void {
  const tempExtractPath = path.join(app.getPath('temp'), 'factory-restore-extract');
  const rollbackPath = path.join(app.getPath('temp'), 'factory-restore-rollback');

  // Create Backup File Dialog and ZIP compression
  ipcMain.handle('backup-create', async () => {
    try {
      // 1. Generate formatted filename
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
      const defaultFilename = `Factory_Backup_${dateStr}_${timeStr}.zip`;

      // 2. Open native Save File Dialog
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Save Backup Archive',
        defaultPath: defaultFilename,
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
      });

      if (canceled || !filePath) {
        return { success: false, message: 'Cancelled' };
      }

      // 3. Compress files and report progress
      await createBackupZip(filePath, (percentage) => {
        mainWindow.webContents.send('backup-progress', percentage);
      });

      return { success: true };
    } catch (err: any) {
      console.error('[Backup IPC] backup-create error:', err);
      return {
        error: true,
        message: err.message || 'Failed to create backup'
      };
    }
  });

  // Select Backup File Dialog, extract and validate
  ipcMain.handle('backup-restore-select', async () => {
    try {
      // 1. Open native Open File Dialog
      const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Backup Archive',
        filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
        properties: ['openFile']
      });

      if (canceled || filePaths.length === 0) {
        return { success: false, message: 'Cancelled' };
      }

      const selectedZip = filePaths[0];

      // 2. Extract to temp and validate contents
      const metadata = await validateBackupZip(selectedZip, tempExtractPath, (percentage) => {
        mainWindow.webContents.send('restore-progress', percentage);
      });

      pendingExtractPath = tempExtractPath;

      return {
        success: true,
        metadata
      };
    } catch (err: any) {
      console.error('[Backup IPC] backup-restore-select error:', err);
      // Clean up failed extraction temp dir
      try {
        await fs.rm(tempExtractPath, { recursive: true, force: true });
      } catch {}
      return {
        error: true,
        message: err.message || 'Validation failed or file is corrupted'
      };
    }
  });

  // Execute restore file swap
  ipcMain.handle('backup-restore-confirm', async () => {
    if (!pendingExtractPath) {
      return { error: true, message: 'No validated restore files found.' };
    }

    try {
      // 1. Safely close database connection
      closeDatabase();

      // 2. Perform the swap
      await applyRestore(pendingExtractPath, rollbackPath);

      // 3. Re-open database connection
      await initializeDatabase();

      // 4. Clean up temp directories
      await fs.rm(pendingExtractPath, { recursive: true, force: true });
      await fs.rm(rollbackPath, { recursive: true, force: true });
      pendingExtractPath = '';

      return { success: true };
    } catch (err: any) {
      console.error('[Backup IPC] backup-restore-confirm error. Attempting rollback...', err);
      
      // Roll back
      try {
        await rollbackRestore(rollbackPath);
        // Re-open previous DB
        await initializeDatabase();
      } catch (rollbackErr) {
        console.error('[Backup IPC] Rollback failed!', rollbackErr);
      }

      // Clean up temp directories
      try {
        await fs.rm(tempExtractPath, { recursive: true, force: true });
        await fs.rm(rollbackPath, { recursive: true, force: true });
      } catch {}
      pendingExtractPath = '';

      return {
        error: true,
        message: err.message || 'Restore failed. Rollback executed to preserve data integrity.'
      };
    }
  });

  // Cancel restore and clean up temp folders
  ipcMain.handle('backup-restore-abort', async () => {
    try {
      await fs.rm(tempExtractPath, { recursive: true, force: true });
      pendingExtractPath = '';
      return { success: true };
    } catch {
      return { success: false };
    }
  });

  // Relaunch the application
  ipcMain.handle('app-restart', () => {
    app.relaunch();
    app.exit(0);
  });
}
