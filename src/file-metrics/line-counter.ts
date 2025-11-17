import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { promisify } from 'node:util';

import { err, ok, Result } from 'neverthrow';

import { logDebug } from '../actions-io.js';
import type { FileAnalysisError } from '../errors/index.js';
import { createFileAnalysisError, ensureError } from '../errors/index.js';

const execFileAsync = promisify(execFile);

export interface LineCountResult {
  lines: number;
  isCapped: boolean;
}

export async function getFileLineCount(
  filePath: string,
  maxLines?: number,
): Promise<Result<LineCountResult, FileAnalysisError>> {
  logDebug(`Counting lines in file: ${filePath}`);

  try {
    const { stdout } = await execFileAsync('wc', ['-l', filePath]);
    const match = stdout.match(/^\s*(\d+)/);
    if (match && match[1]) {
      const lines = Number.parseInt(match[1], 10);
      logDebug(`Got line count from wc -l: ${lines}`);
      if (maxLines && lines > maxLines) {
        return ok({ lines: maxLines, isCapped: true });
      }
      return ok({ lines, isCapped: false });
    }
  } catch (error) {
    logDebug(`wc -l failed: ${ensureError(error).message}`);
  }

  try {
    const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineCount = 0;

    for await (const _line of rl) {
      lineCount++;

      if (maxLines && lineCount >= maxLines) {
        rl.close();
        fileStream.destroy();
        logDebug(`Line count reached max (${maxLines}), early termination`);
        return ok({ lines: maxLines, isCapped: true });
      }
    }

    logDebug(`Got line count from Node.js streaming: ${lineCount}`);
    return ok({ lines: lineCount, isCapped: false });
  } catch (error) {
    const message = ensureError(error).message;
    return err(createFileAnalysisError(filePath, `Failed to count lines: ${message}`));
  }
}
