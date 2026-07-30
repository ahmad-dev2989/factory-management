import { app } from 'electron';
import pkg from 'electron-updater';
import path from 'node:path';
import fs from 'node:fs/promises';
import { executeQuery } from '../database/database.js';
const { autoUpdater } = pkg;
// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
/**
 * Returns the current application version from package.json
 */
async function getAppVersion() {
    try {
        const packageJsonPath = path.join(app.getAppPath(), 'package.json');
        const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        return pkg.version || '0.0.0';
    }
    catch {
        return '0.0.0';
    }
}
/**
 * Checks if a version is skipped by querying SQLite app_settings
 */
async function isVersionSkipped(version) {
    try {
        const rows = await executeQuery("SELECT value FROM app_settings WHERE key = 'skipped_version'");
        if (rows && rows[0]) {
            return rows[0].value === version;
        }
    }
    catch (err) {
        console.error('[UpdateService] Failed to check skipped version:', err);
    }
    return false;
}
/**
 * Saves a version to skip list in SQLite app_settings
 */
export async function skipVersion(version) {
    try {
        await executeQuery("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('skipped_version', ?)", [version]);
        console.log(`[UpdateService] Version ${version} added to skip list.`);
    }
    catch (err) {
        console.error('[UpdateService] Failed to save skipped version:', err);
    }
}
/**
 * Checks for updates asynchronously
 */
export async function checkForUpdates(mainWindow) {
    const currentVersion = await getAppVersion();
    const isDev = !app.isPackaged;
    console.log(`[UpdateService] Checking for updates. Current version: ${currentVersion} (isDev: ${isDev})`);
    // ==========================================
    // Development / Simulation Mode
    // ==========================================
    if (isDev) {
        // Simulate check. If version in package.json is 0.0.0, we simulate an update to 1.0.1 being available!
        if (currentVersion === '0.0.0' || currentVersion === '0.0.0-dev') {
            const targetVersion = '1.0.1';
            const skipped = await isVersionSkipped(targetVersion);
            if (skipped) {
                console.log(`[UpdateService] Simulated version ${targetVersion} is marked as skipped.`);
                return { updateAvailable: false };
            }
            return {
                updateAvailable: true,
                version: targetVersion,
                releaseDate: new Date().toISOString().substring(0, 10),
                releaseNotes: '<h3>V1.0.1 Features:</h3><ul><li>Added automated SQLite database backups</li><li>Implemented local file storage management</li><li>Resolved Electron ESM load issues</li></ul>',
                fileSize: '48.5 MB'
            };
        }
        return { updateAvailable: false };
    }
    // ==========================================
    // Packaged / Production Mode
    // ==========================================
    return new Promise((resolve) => {
        // Setup temporary event listeners
        const onUpdateAvailable = async (info) => {
            cleanup();
            const latestVersion = info.version;
            const skipped = await isVersionSkipped(latestVersion);
            if (skipped) {
                console.log(`[UpdateService] Production version ${latestVersion} is marked as skipped.`);
                resolve({ updateAvailable: false });
                return;
            }
            // Calculate size
            let sizeStr = 'Unknown';
            if (info.files && info.files[0] && info.files[0].size) {
                const sizeMb = (info.files[0].size / (1024 * 1024)).toFixed(1);
                sizeStr = `${sizeMb} MB`;
            }
            resolve({
                updateAvailable: true,
                version: latestVersion,
                releaseDate: info.releaseDate ? info.releaseDate.substring(0, 10) : 'Recent',
                releaseNotes: info.releaseNotes || 'Bug fixes and performance enhancements.',
                fileSize: sizeStr
            });
        };
        const onUpdateNotAvailable = () => {
            cleanup();
            resolve({ updateAvailable: false });
        };
        const onError = (err) => {
            cleanup();
            console.error('[UpdateService] Update check failed:', err);
            resolve({ updateAvailable: false }); // Fallback to let the app open
        };
        const cleanup = () => {
            autoUpdater.removeListener('update-available', onUpdateAvailable);
            autoUpdater.removeListener('update-not-available', onUpdateNotAvailable);
            autoUpdater.removeListener('error', onError);
        };
        autoUpdater.on('update-available', onUpdateAvailable);
        autoUpdater.on('update-not-available', onUpdateNotAvailable);
        autoUpdater.on('error', onError);
        autoUpdater.checkForUpdates().catch((err) => {
            cleanup();
            console.error('[UpdateService] Failed to trigger update check:', err);
            resolve({ updateAvailable: false });
        });
    });
}
/**
 * Downloads the update payload
 */
export async function downloadUpdate(mainWindow) {
    const isDev = !app.isPackaged;
    if (isDev) {
        // Simulate download with speed, remaining time, and progress bar updates
        console.log('[UpdateService] Starting simulated download...');
        let percent = 0;
        const totalBytes = 48.5 * 1024 * 1024; // 48.5 MB
        const interval = setInterval(() => {
            percent += Math.floor(Math.random() * 5) + 3;
            if (percent >= 100) {
                percent = 100;
                clearInterval(interval);
                mainWindow.webContents.send('update-progress', {
                    percent: 100,
                    speed: '0 KB/s',
                    remaining: '0s'
                });
                // Transition to install phase
                setTimeout(() => {
                    mainWindow.webContents.send('update-state', 'installing');
                    setTimeout(() => {
                        mainWindow.webContents.send('update-state', 'restarting');
                    }, 1500);
                }, 1000);
            }
            else {
                // Calculate simulated speed and remaining time
                const speedMb = (Math.random() * 2 + 2.5).toFixed(1); // 2.5 to 4.5 MB/s
                const speed = `${speedMb} MB/s`;
                const remainingSec = Math.round(((100 - percent) / 100) * (totalBytes / (parseFloat(speedMb) * 1024 * 1024)));
                const remaining = `${remainingSec}s remaining`;
                mainWindow.webContents.send('update-progress', {
                    percent,
                    speed,
                    remaining
                });
            }
        }, 200);
        return;
    }
    // Packaged mode: handle standard download progress broadcasts
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
        mainWindow.webContents.send('update-error', err.message || 'Download failed');
    });
    await autoUpdater.downloadUpdate();
}
