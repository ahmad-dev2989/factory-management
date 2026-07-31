import { app, BrowserWindow } from 'electron';
import pkg from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs/promises';
import { executeQuery } from '../database/database.js';

const { autoUpdater } = pkg;

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

interface UpdateCheckResult {
  updateAvailable: boolean;
  version?: string;
  releaseDate?: string;
  releaseNotes?: string;
  fileSize?: string;
  isSkipped?: boolean;
}

/**
 * Returns the current application version from package.json
 */
async function getAppVersion(): Promise<string> {
  try {
    const packageJsonPath = path.join(app.getAppPath(), 'package.json');
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Checks if a version is skipped by querying SQLite app_settings
 */
async function isVersionSkipped(version: string): Promise<boolean> {
  try {
    const rows = await executeQuery("SELECT value FROM app_settings WHERE key = 'skipped_version'");
    if (rows && rows[0]) {
      return rows[0].value === version;
    }
  } catch (err) {
    console.error('[UpdateService] Failed to check skipped version:', err);
  }
  return false;
}

/**
 * Saves a version to skip list in SQLite app_settings
 */
export async function skipVersion(version: string): Promise<void> {
  try {
    await executeQuery(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('skipped_version', ?)",
      [version]
    );
    console.log(`[UpdateService] Version ${version} added to skip list.`);
  } catch (err) {
    console.error('[UpdateService] Failed to save skipped version:', err);
  }
}

/**
 * Initializes updater listeners once
 */
export function initializeUpdater(mainWindow: BrowserWindow): void {
  // Clear any existing listeners to prevent duplicates
  autoUpdater.removeAllListeners('download-progress');
  autoUpdater.removeAllListeners('update-downloaded');
  autoUpdater.removeAllListeners('error');

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    const speedMb = (progressObj.bytesPerSecond / (1024 * 1024)).toFixed(1);
    const speed = `${speedMb} MB/s`;
    
    let remaining = 'Calculating...';
    if (progressObj.bytesPerSecond > 0) {
      const remainingBytes = progressObj.total - progressObj.transferred;
      const remainingSec = Math.round(remainingBytes / progressObj.bytesPerSecond);
      remaining = `${remainingSec}s remaining`;
    }

    mainWindow.webContents.send('update-progress', {
      percent,
      speed,
      remaining
    });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-state', 'installing');
    setTimeout(() => {
      mainWindow.webContents.send('update-state', 'restarting');
      setTimeout(() => {
        autoUpdater.quitAndInstall();
      }, 1000);
    }, 1500);
  });

  autoUpdater.on('error', (err) => {
    console.error('[UpdateService] Updater event error:', err);
    mainWindow.webContents.send('update-error', err.message || 'Download failed');
  });
}

/**
 * Checks for updates asynchronously using electron-updater
 */
export async function checkForUpdates(mainWindow: BrowserWindow): Promise<UpdateCheckResult> {
  const currentVersion = await getAppVersion();
  console.log(`[UpdateService] Checking for updates. Current version: ${currentVersion}`);

  // In development, skip checking to avoid hangs and issues
  if (!app.isPackaged) {
    console.log('[UpdateService] Skipping update check in development mode.');
    return { updateAvailable: false };
  }

  return new Promise<UpdateCheckResult>((resolve) => {
    let resolved = false;

    const finish = (result: UpdateCheckResult) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      clearTimeout(timeoutId);
      resolve(result);
    };

    const onUpdateAvailable = async (info: any) => {
      const latestVersion = info.version;
      const skipped = await isVersionSkipped(latestVersion);
      
      // Calculate size
      let sizeStr = 'Unknown';
      if (info.files && info.files[0] && info.files[0].size) {
        const sizeMb = (info.files[0].size / (1024 * 1024)).toFixed(1);
        sizeStr = `${sizeMb} MB`;
      }

      finish({
        updateAvailable: true,
        version: latestVersion,
        releaseDate: info.releaseDate ? String(info.releaseDate).substring(0, 10) : 'Recent',
        releaseNotes: info.releaseNotes || 'Bug fixes and performance enhancements.',
        fileSize: sizeStr,
        isSkipped: skipped
      });
    };

    const onUpdateNotAvailable = () => {
      finish({ updateAvailable: false });
    };

    const onError = (err: any) => {
      console.warn('[UpdateService] Update check failed:', err.message || err);
      finish({ updateAvailable: false });
    };

    const cleanup = () => {
      autoUpdater.removeListener('update-available', onUpdateAvailable);
      autoUpdater.removeListener('update-not-available', onUpdateNotAvailable);
      autoUpdater.removeListener('error', onError);
    };

    // Set a 5-second safety timeout
    const timeoutId = setTimeout(() => {
      console.warn('[UpdateService] Update check timed out after 5 seconds.');
      finish({ updateAvailable: false });
    }, 5000);

    autoUpdater.on('update-available', onUpdateAvailable);
    autoUpdater.on('update-not-available', onUpdateNotAvailable);
    autoUpdater.on('error', onError);

    autoUpdater.checkForUpdates().then((result) => {
      if (!result) {
        finish({ updateAvailable: false });
      }
    }).catch((err) => {
      console.warn('[UpdateService] Failed to trigger update check:', err.message || err);
      finish({ updateAvailable: false });
    });
  });
}

/**
 * Downloads the update payload using electron-updater
 */
export async function downloadUpdate(): Promise<void> {
  console.log('[UpdateService] Starting download...');
  await autoUpdater.downloadUpdate();
}
