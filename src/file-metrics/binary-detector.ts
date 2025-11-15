import { promises as fs } from 'node:fs';
import * as path from 'node:path';

import { logDebug } from '../actions-io.js';
import { ensureError } from '../errors/index.js';

const BINARY_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.ico',
  '.webp',
  '.tiff',
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.webm',
  '.mkv',
  '.m4v',
  '.mp3',
  '.wav',
  '.flac',
  '.aac',
  '.ogg',
  '.wma',
  '.m4a',
  '.zip',
  '.tar',
  '.gz',
  '.bz2',
  '.xz',
  '.rar',
  '.7z',
  '.jar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.app',
  '.deb',
  '.rpm',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.eot',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.pyc',
  '.pyo',
  '.class',
  '.o',
  '.a',
  '.lib',
  '.wasm',
  '.db',
  '.sqlite',
  '.sqlite3',
  '.DS_Store',
]);

export async function isBinaryFile(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  try {
    const buffer = await fs.readFile(filePath, { encoding: null });
    const sample = buffer.slice(0, 8192);

    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) {
        return true;
      }
    }

    let nonPrintable = 0;
    for (let i = 0; i < Math.min(sample.length, 512); i++) {
      const byte = sample[i];
      if (byte !== undefined && (byte < 32 || byte > 126) && byte !== 9 && byte !== 10 && byte !== 13) {
        nonPrintable++;
      }
    }

    return nonPrintable / Math.min(sample.length, 512) > 0.3;
  } catch (error) {
    logDebug(`Could not read file for binary detection: ${ensureError(error).message}`);
    return false;
  }
}
