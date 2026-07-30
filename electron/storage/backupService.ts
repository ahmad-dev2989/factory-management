import { app } from 'electron';
import AdmZip from 'adm-zip';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { executeQuery } from '../database/database.js';

interface BackupMetadata {
  backupDate: string;
  appVersion: string;
  databaseVersion: number;
  backupFormatVersion: string;
  os: string;
  backupCreatorVersion: string;
}

/**
 * Get all files recursively inside a directory
 */
async function getFilesRecursively(dir: string, baseDir: string): Promise<Array<{ absPath: string; relPath: string }>> {
  let results: Array<{ absPath: string; relPath: string }> = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const item of list) {
      const resPath = path.resolve(dir, item.name);
      if (item.isDirectory()) {
        const sub = await getFilesRecursively(resPath, baseDir);
        results = results.concat(sub);
      } else {
        const relPath = path.relative(baseDir, resPath).replace(/\\/g, '/');
        results.push({ absPath: resPath, relPath });
      }
    }
  } catch (err: any) {
    if (err.code !== 'ENOENT') {
      console.error(`[Backup] Error reading dir: ${dir}`, err);
    }
  }
  return results;
}

/**
 * Compress database and files into a single ZIP archive
 */
export async function createBackupZip(
  destZipPath: string,
  progressCallback: (percentage: number) => void
): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'factory.db');

  // 1. Gather all files to back up
  const fileList: Array<{ absPath: string; relPath: string }> = [];

  // Add SQLite database
  try {
    await fs.access(dbPath);
    fileList.push({ absPath: dbPath, relPath: 'factory.db' });
  } catch {
    throw new Error('Active SQLite database file (factory.db) was not found.');
  }

  // Add storage folders
  const foldersToBackup = ['Company', 'Products', 'Employees', 'Customers', 'Attachments'];
  for (const folder of foldersToBackup) {
    const folderPath = path.join(userDataPath, folder);
    const files = await getFilesRecursively(folderPath, userDataPath);
    fileList.push(...files);
  }

  // 2. Fetch SQLite DB version mapping
  let dbVersion = 1;
  try {
    const rows = await executeQuery('PRAGMA user_version');
    if (rows && rows[0]) {
      dbVersion = Number(rows[0].user_version) || 1;
    }
  } catch (err) {
    console.warn('[Backup] Could not read PRAGMA user_version, defaulting to 1:', err);
  }

  // 3. Construct Metadata object
  let appVersion = '1.0.0';
  try {
    const packageJsonPath = path.join(app.getAppPath(), 'package.json');
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    if (pkg && pkg.version) {
      appVersion = pkg.version;
    }
  } catch (versionErr) {
    console.warn('[Backup] Failed to read package.json version, using fallback:', versionErr);
  }

  const now = new Date();
  const dateString = now.toISOString().replace('T', ' ').substring(0, 16);
  const metadata: BackupMetadata = {
    backupDate: dateString,
    appVersion,
    databaseVersion: dbVersion,
    backupFormatVersion: '1.0',
    os: os.platform(),
    backupCreatorVersion: 'Antigravity-Backup-v1.0'
  };

  // 4. Create ZIP archive
  const zip = new AdmZip();

  // Add metadata manifest
  zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)));

  // Add files and report incremental progress
  const totalFiles = fileList.length;
  for (let i = 0; i < totalFiles; i++) {
    const file = fileList[i];
    try {
      const fileBuffer = await fs.readFile(file.absPath);
      // Determine zip path parent dir
      const zipPath = path.dirname(file.relPath);
      const zipName = path.basename(file.relPath);
      zip.addFile(file.relPath, fileBuffer);
    } catch (readErr) {
      console.error(`[Backup] Failed to add file ${file.relPath}:`, readErr);
    }
    
    // Call progress callback
    const pct = Math.round(((i + 1) / totalFiles) * 100);
    progressCallback(pct);
  }

  // 5. Write completed ZIP archive to destination path
  await new Promise<void>((resolve, reject) => {
    zip.writeZip(destZipPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  console.log(`[Backup] Saved compressed ZIP to: ${destZipPath}`);
}

/**
 * Validates the selected backup ZIP archive
 */
export async function validateBackupZip(
  srcZipPath: string,
  tempExtractPath: string,
  progressCallback: (percentage: number) => void
): Promise<BackupMetadata> {
  // Ensure temp dir exists and is empty
  await fs.mkdir(tempExtractPath, { recursive: true });
  const files = await fs.readdir(tempExtractPath);
  for (const file of files) {
    await fs.rm(path.join(tempExtractPath, file), { recursive: true, force: true });
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(srcZipPath);
  } catch (err) {
    throw new Error('The selected file is not a valid ZIP archive.');
  }

  const entries = zip.getEntries();
  const totalEntries = entries.length;

  if (totalEntries === 0) {
    throw new Error('The selected backup ZIP archive is empty.');
  }

  // Verify metadata.json and factory.db are inside the ZIP structure
  const hasMetadata = entries.some(e => e.entryName === 'metadata.json');
  const hasDb = entries.some(e => e.entryName === 'factory.db');

  if (!hasMetadata) {
    throw new Error('The selected backup file is missing validation metadata (metadata.json).');
  }
  if (!hasDb) {
    throw new Error('The selected backup file is missing the SQLite database (factory.db).');
  }

  // Extract entries one by one to report progress
  for (let i = 0; i < totalEntries; i++) {
    const entry = entries[i];
    const targetAbsPath = path.join(tempExtractPath, entry.entryName);
    
    if (entry.isDirectory) {
      await fs.mkdir(targetAbsPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(targetAbsPath), { recursive: true });
      await fs.writeFile(targetAbsPath, entry.getData());
    }

    const pct = Math.round(((i + 1) / totalEntries) * 100);
    progressCallback(pct);
  }

  // Read and parse metadata
  let metadata: BackupMetadata;
  try {
    const metadataRaw = await fs.readFile(path.join(tempExtractPath, 'metadata.json'), 'utf8');
    metadata = JSON.parse(metadataRaw);
  } catch {
    throw new Error('Validation metadata (metadata.json) is corrupted or unreadable.');
  }

  // Check version compatibility
  if (metadata.backupFormatVersion !== '1.0') {
    throw new Error(`Unsupported backup format version: ${metadata.backupFormatVersion}`);
  }

  return metadata;
}

/**
 * Safely replaces the active database and storage folders with extracted backup contents
 */
export async function applyRestore(
  tempExtractPath: string,
  backupRollbackPath: string
): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'factory.db');
  
  // 1. Create rollback directory
  await fs.mkdir(backupRollbackPath, { recursive: true });

  // 2. Backup current database file (for rollback safety)
  try {
    await fs.access(dbPath);
    await fs.copyFile(dbPath, path.join(backupRollbackPath, 'factory.db'));
  } catch {
    // No existing DB found, skip rollback copy
  }

  // 3. Backup current storage folders
  const folders = ['Company', 'Products', 'Employees', 'Customers', 'Attachments'];
  for (const folder of folders) {
    const srcFolder = path.join(userDataPath, folder);
    const dstFolder = path.join(backupRollbackPath, folder);
    try {
      await fs.mkdir(dstFolder, { recursive: true });
      const files = await getFilesRecursively(srcFolder, userDataPath);
      for (const f of files) {
        const destFilePath = path.join(backupRollbackPath, f.relPath);
        await fs.mkdir(path.dirname(destFilePath), { recursive: true });
        await fs.copyFile(f.absPath, destFilePath);
      }
    } catch {
      // Folder might not exist, skip rollback copy
    }
  }

  // 4. Wipe active directories (except database lock files like WAL/SHM, we delete target factory.db file directly)
  try {
    await fs.rm(dbPath, { force: true });
  } catch (rmErr) {
    console.warn('[Restore] Failed to remove active factory.db:', rmErr);
  }

  for (const folder of folders) {
    try {
      await fs.rm(path.join(userDataPath, folder), { recursive: true, force: true });
    } catch (rmErr) {
      console.warn(`[Restore] Failed to remove folder ${folder}:`, rmErr);
    }
  }

  // 5. Swap files from tempExtractPath to active AppData userData folder
  const dbSrc = path.join(tempExtractPath, 'factory.db');
  await fs.copyFile(dbSrc, dbPath);

  for (const folder of folders) {
    const folderSrc = path.join(tempExtractPath, folder);
    try {
      await fs.access(folderSrc);
      const files = await getFilesRecursively(folderSrc, tempExtractPath);
      for (const f of files) {
        const destFilePath = path.join(userDataPath, f.relPath);
        await fs.mkdir(path.dirname(destFilePath), { recursive: true });
        await fs.copyFile(f.absPath, destFilePath);
      }
    } catch {
      // Extracted folder doesn't exist in backup (e.g. no products uploaded), skip
    }
  }

  console.log('[Restore] Backup files successfully restored to userData directories.');
}

/**
 * Rolls back the database and storage files to previous state from backupRollbackPath
 */
export async function rollbackRestore(backupRollbackPath: string): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'factory.db');

  console.warn('[Restore] Restoring rollback state due to critical error...');

  try {
    // Restore DB
    const dbBackup = path.join(backupRollbackPath, 'factory.db');
    await fs.copyFile(dbBackup, dbPath);

    // Restore folders
    const folders = ['Company', 'Products', 'Employees', 'Customers', 'Attachments'];
    for (const folder of folders) {
      const folderSrc = path.join(backupRollbackPath, folder);
      const folderDest = path.join(userDataPath, folder);
      await fs.rm(folderDest, { recursive: true, force: true });

      try {
        await fs.access(folderSrc);
        const files = await getFilesRecursively(folderSrc, backupRollbackPath);
        for (const f of files) {
          const destFilePath = path.join(userDataPath, f.relPath);
          await fs.mkdir(path.dirname(destFilePath), { recursive: true });
          await fs.copyFile(f.absPath, destFilePath);
        }
      } catch {
        // Rollback folder not populated
      }
    }
    console.log('[Restore] Rollback completed successfully.');
  } catch (err) {
    console.error('[Restore] Critical error: Rollback failed!', err);
  }
}
