import { app } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Supported storage folders (relative to app.getPath("userData"))
export const FOLDERS = {
  companyLogo: 'Company/Logo',
  productImages: 'Products/Images',
  attachments: 'Attachments',
  employeePhotos: 'Employees/Photos',
  customerDocs: 'Customers/Documents',
  temp: 'Temporary'
};

/**
 * Resolves a relative path against the app's userData directory
 */
export function getAbsolutePath(relativePath: string): string {
  return path.join(app.getPath('userData'), relativePath);
}

/**
 * Ensures that the destination directory exists
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Checks if a file exists on disk
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  if (!relativePath) return false;
  try {
    const absPath = getAbsolutePath(relativePath);
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a base64 encoded data URL to the specified category folder
 * @param categoryFolder The relative folder name from FOLDERS mapping
 * @param originalName The original name of the file (e.g. 'logo.png')
 * @param base64Data The full base64 data URL (e.g. 'data:image/png;base64,iVBOR...')
 */
export async function saveFile(
  categoryFolder: string,
  originalName: string,
  base64Data: string
): Promise<{ relativePath: string; fileSize: number; mimeType: string; originalName: string }> {
  // Parse base64 data URL
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 data URL format.');
  }

  const mimeType = matches[1];
  const payload = matches[2];
  const buffer = Buffer.from(payload, 'base64');
  const fileSize = buffer.length;

  // Generate unique filename to prevent collision
  const ext = path.extname(originalName);
  const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniqueName = `${baseName}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;

  // Build target paths
  const relativeFolderPath = categoryFolder;
  const absoluteFolderPath = getAbsolutePath(relativeFolderPath);
  await ensureDir(absoluteFolderPath);

  const relativeFilePath = path.join(relativeFolderPath, uniqueName).replace(/\\/g, '/');
  const absoluteFilePath = getAbsolutePath(relativeFilePath);

  // Write file to disk
  await fs.writeFile(absoluteFilePath, buffer);

  console.log(`[Storage] Saved file to disk: ${relativeFilePath} (${fileSize} bytes)`);

  return {
    relativePath: relativeFilePath,
    fileSize,
    mimeType,
    originalName
  };
}

/**
 * Reads a file from disk and returns a base64 data URL
 */
export async function readFile(relativePath: string): Promise<string> {
  const absolutePath = getAbsolutePath(relativePath);
  const buffer = await fs.readFile(absolutePath);

  // Infer MIME type from file extension
  const ext = path.extname(relativePath).toLowerCase();
  let mimeType = 'application/octet-stream';
  if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.gif') mimeType = 'image/gif';
  else if (ext === '.svg') mimeType = 'image/svg+xml';
  else if (ext === '.webp') mimeType = 'image/webp';
  else if (ext === '.pdf') mimeType = 'application/pdf';

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Deletes a file from disk if it exists
 */
export async function deleteFile(relativePath: string): Promise<boolean> {
  if (!relativePath) return false;
  try {
    const absolutePath = getAbsolutePath(relativePath);
    await fs.unlink(absolutePath);
    console.log(`[Storage] Deleted file from disk: ${relativePath}`);
    return true;
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return false; // Already deleted
    }
    console.error(`[Storage] Failed to delete file: ${relativePath}`, err);
    throw err;
  }
}
