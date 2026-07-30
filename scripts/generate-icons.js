import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPng = "C:\\Users\\Ahmed\\.gemini\\antigravity-ide\\brain\\afbb950f-0f8f-405b-9e23-0f220cbd4865\\app_icon_1785417005787.png";
const destDir = path.join(__dirname, '../public/app-icons');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const destPng = path.join(destDir, 'icon.png');
const destIco = path.join(destDir, 'icon.ico');
const destIcns = path.join(destDir, 'icon.icns');

// Read the original PNG
const pngData = fs.readFileSync(srcPng);

// 1. Write the PNG
fs.writeFileSync(destPng, pngData);
console.log('Generated public/app-icons/icon.png');

// 2. Generate ICO
// ICO Header (6 bytes)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type (1 = ICO)
icoHeader.writeUInt16LE(1, 4); // Count of images (1)

// Directory Entry (16 bytes)
const icoDir = Buffer.alloc(16);
icoDir.writeUInt8(0, 0); // Width: 256 (0 means 256)
icoDir.writeUInt8(0, 1); // Height: 256 (0 means 256)
icoDir.writeUInt8(0, 2); // Color count: 0 (no palette)
icoDir.writeUInt8(0, 3); // Reserved
icoDir.writeUInt16LE(1, 4); // Color planes (1)
icoDir.writeUInt16LE(32, 6); // Bits per pixel (32)
icoDir.writeUInt32LE(pngData.length, 8); // Size of the PNG data
icoDir.writeUInt32LE(6 + 16, 12); // Offset of the PNG data from file start (22)

const icoData = Buffer.concat([icoHeader, icoDir, pngData]);
fs.writeFileSync(destIco, icoData);
console.log('Generated public/app-icons/icon.ico (valid PNG-compressed ICO)');

// 3. Generate ICNS
// ICNS Chunks:
// - Header (8 bytes): magic 'icns', file size (big-endian)
// - Chunk (8 bytes + pngData.length): chunk magic 'ic13' (for 256x256 png), chunk size (big-endian)
const chunkHeader = Buffer.alloc(8);
chunkHeader.write('ic13', 0, 4, 'ascii'); // 256x256 PNG chunk
chunkHeader.writeUInt32BE(pngData.length + 8, 4); // Chunk size (including this 8-byte header)

const totalSize = 8 + 8 + pngData.length;
const icnsHeader = Buffer.alloc(8);
icnsHeader.write('icns', 0, 4, 'ascii'); // Magic
icnsHeader.writeUInt32BE(totalSize, 4); // Total file size

const icnsData = Buffer.concat([icnsHeader, chunkHeader, pngData]);
fs.writeFileSync(destIcns, icnsData);
console.log('Generated public/app-icons/icon.icns');
