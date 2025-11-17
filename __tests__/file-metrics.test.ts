import { createReadStream, promises as fs } from 'node:fs';
import { createInterface } from 'node:readline';

import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Create hoisted mock function
const { mockExecAsync } = vi.hoisted(() => {
  return {
    mockExecAsync: vi.fn(),
  };
});

// Setup mocks
vi.mock('node:fs', () => ({
  promises: {
    stat: vi.fn(),
    readFile: vi.fn(),
    access: vi.fn(),
  },
  createReadStream: vi.fn(),
}));

vi.mock('node:readline', () => ({
  createInterface: vi.fn(),
}));

vi.mock('node:child_process');

// Mock util to return our hoisted mock function
vi.mock('node:util', () => ({
  promisify: () => mockExecAsync,
}));

vi.mock('@actions/github');
vi.mock('@actions/core');

// Import after mocking
import type { DiffFile } from '../src/diff-strategy';
import { analyzeFiles, getFileLineCount, getFileSize, isBinaryFile } from '../src/file-metrics';

describe('FileMetrics', () => {
  let mockOctokit: any;

  // Helper to create mock Stats object
  const createMockStats = (size: number): any => ({
    size,
    isFile: () => true,
    isDirectory: () => false,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    mode: 0o644,
    nlink: 1,
    uid: 1000,
    gid: 1000,
    rdev: 0,
    blksize: 4096,
    ino: 123456,
    blocks: Math.ceil(size / 512),
    atime: new Date(),
    mtime: new Date(),
    ctime: new Date(),
    birthtime: new Date(),
    atimeMs: Date.now(),
    mtimeMs: Date.now(),
    ctimeMs: Date.now(),
    birthtimeMs: Date.now(),
    dev: 123,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup GitHub mock
    mockOctokit = {
      rest: {
        repos: {
          getContent: vi.fn(),
        },
      },
    };
    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getFileSize', () => {
    it('should get file size using fs.stat (preferred)', async () => {
      vi.mocked(fs.stat).mockResolvedValue(createMockStats(1024));

      const result = await getFileSize('src/test.ts', 'token', {
        owner: 'owner',
        repo: 'repo',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(1024);
      }
      expect(fs.stat).toHaveBeenCalledWith('src/test.ts');
    });

    it('should fallback to git ls-tree when fs.stat fails', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));
      mockExecAsync.mockResolvedValue({
        stdout: '100644 blob abc123    2048\tsrc/test.ts',
        stderr: '',
      });

      const result = await getFileSize('src/test.ts', 'token', {
        owner: 'owner',
        repo: 'repo',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(2048);
      }
    });

    it('should fallback to GitHub API when both fs and git fail', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));
      mockExecAsync.mockRejectedValue(new Error('Not a git repo'));
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          type: 'file',
          size: 3072,
        },
      });

      const result = await getFileSize('src/test.ts', 'token', {
        owner: 'owner',
        repo: 'repo',
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(3072);
      }
    });

    it('should return FileAnalysisError when all methods fail', async () => {
      vi.mocked(fs.stat).mockRejectedValue(new Error('File not found'));
      mockExecAsync.mockRejectedValue(new Error('Not a git repo'));
      mockOctokit.rest.repos.getContent.mockRejectedValue(new Error('API error'));

      const result = await getFileSize('src/test.ts', 'token', {
        owner: 'owner',
        repo: 'repo',
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('FileAnalysisError');
        expect(result.error.file).toBe('src/test.ts');
      }
    });
  });

  describe('getFileLineCount', () => {
    it('should count lines using wc -l (preferred)', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '     150 src/test.ts',
        stderr: '',
      });

      const result = await getFileLineCount('src/test.ts');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.lines).toBe(150);
        expect(result.value.isCapped).toBe(false);
      }
      expect(mockExecAsync).toHaveBeenCalledWith('wc', ['-l', 'src/test.ts']);
    });

    it('should fallback to Node.js streaming implementation when wc fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      // Mock streaming for static imports
      const mockReadStream = {
        destroy: vi.fn(),
        on: vi.fn(),
        [Symbol.asyncIterator]: async function* () {
          yield 'line1';
          yield 'line2';
          yield 'line3';
        },
      };

      const mockReadlineInterface = {
        close: vi.fn(),
        [Symbol.asyncIterator]: async function* () {
          yield 'line1';
          yield 'line2';
          yield 'line3';
        },
      };

      vi.mocked(createReadStream).mockReturnValue(mockReadStream as any);
      vi.mocked(createInterface).mockReturnValue(mockReadlineInterface as any);

      const result = await getFileLineCount('src/test.ts');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.lines).toBe(3);
        expect(result.value.isCapped).toBe(false);
      }
    });

    it('should handle large files with streaming (early termination)', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      // Mock streaming to simulate large file
      const mockReadStream = {
        destroy: vi.fn(),
        on: vi.fn(),
      };

      const mockReadlineInterface = {
        close: vi.fn(),
        [Symbol.asyncIterator]: async function* () {
          for (let i = 0; i < 100000; i++) {
            yield `line ${i}`;
          }
        },
      };

      vi.mocked(createReadStream).mockReturnValue(mockReadStream as any);
      vi.mocked(createInterface).mockReturnValue(mockReadlineInterface as any);

      const result = await getFileLineCount('src/large.ts', 50000);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should stop counting at maxLines
        expect(result.value.lines).toBe(50000);
        expect(result.value.isCapped).toBe(true);
      }

      // Verify stream was closed early
      expect(mockReadlineInterface.close).toHaveBeenCalled();
      expect(mockReadStream.destroy).toHaveBeenCalled();
    });

    it('should handle streaming errors gracefully', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      // Mock createReadStream to throw error
      vi.mocked(createReadStream).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await getFileLineCount('src/test.ts');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('FileAnalysisError');
        expect(result.error.file).toBe('src/test.ts');
        expect(result.error.message).toContain('Failed to count lines');
      }
    });
  });

  describe('isBinaryFile', () => {
    it('should identify binary files by extension', async () => {
      expect(await isBinaryFile('image.jpg')).toBe(true);
      expect(await isBinaryFile('app.exe')).toBe(true);
      expect(await isBinaryFile('data.bin')).toBe(true);
      expect(await isBinaryFile('archive.zip')).toBe(true);
      expect(await isBinaryFile('font.woff')).toBe(true);
      expect(await isBinaryFile('video.mp4')).toBe(true);
    });

    it('should identify text files by extension', async () => {
      expect(await isBinaryFile('index.ts')).toBe(false);
      expect(await isBinaryFile('README.md')).toBe(false);
      expect(await isBinaryFile('config.json')).toBe(false);
      expect(await isBinaryFile('style.css')).toBe(false);
      expect(await isBinaryFile('script.py')).toBe(false);
    });

    it('should use content detection for unknown extensions', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from([0x00, 0x01, 0x02, 0xff]));
      expect(await isBinaryFile('unknown.xyz')).toBe(true);

      vi.mocked(fs.readFile).mockResolvedValue('This is text content');
      expect(await isBinaryFile('unknown.xyz')).toBe(false);
    });

    it('should handle files without extensions', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('#!/bin/bash\necho "hello"');
      expect(await isBinaryFile('Makefile')).toBe(false);

      // ELF header with more binary data (more than 30% non-printable)
      vi.mocked(fs.readFile).mockResolvedValue(
        Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00]),
      );
      expect(await isBinaryFile('binary')).toBe(true);
    });

    it('should handle read errors gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      // Assume text file if we can't read it
      expect(await isBinaryFile('unknown.xyz')).toBe(false);
    });
  });

  describe('analyzeFiles', () => {
    const config = {
      fileSizeLimit: 1000000, // 1MB
      fileLineLimit: 1000,
      maxAddedLines: 5000,
      maxFileCount: 100,
      excludePatterns: ['*.lock', 'node_modules/**'],
    };

    const context = {
      owner: 'owner',
      repo: 'repo',
    };

    it('should analyze files and calculate metrics', async () => {
      const files: DiffFile[] = [
        { filename: 'src/index.ts', additions: 100, deletions: 20, status: 'modified' },
        { filename: 'src/utils.ts', additions: 50, deletions: 10, status: 'modified' },
        { filename: 'src/new.ts', additions: 200, deletions: 0, status: 'added' },
      ];

      // Mock file sizes
      vi.mocked(fs.stat).mockImplementation(path => {
        const sizes: Record<string, number> = {
          'src/index.ts': 5000,
          'src/utils.ts': 3000,
          'src/new.ts': 8000,
        };
        return Promise.resolve(createMockStats(sizes[path as string] || 1000));
      });

      // Mock line counts (execFile format: command, args[])
      mockExecAsync.mockImplementation((command: string, args?: readonly string[]) => {
        if (command === 'wc' && args?.[0] === '-l') {
          const lines: Record<string, string> = {
            'src/index.ts': '     200 src/index.ts',
            'src/utils.ts': '     150 src/utils.ts',
            'src/new.ts': '     300 src/new.ts',
          };
          const file = args[1] || '';
          return Promise.resolve({
            stdout: lines[file] || '     100 unknown',
            stderr: '',
          });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const result = await analyzeFiles(files, config, 'token', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metrics.totalFiles).toBe(3);
        expect(result.value.metrics.totalAdditions).toBe(350);
        expect(result.value.metrics.filesAnalyzed).toHaveLength(3);
        expect(result.value.metrics.filesExcluded).toHaveLength(0);
        expect(result.value.metrics.filesSkippedBinary).toHaveLength(0);
      }
    });

    it('should exclude files matching patterns', async () => {
      const files: DiffFile[] = [
        { filename: 'src/index.ts', additions: 100, deletions: 20, status: 'modified' },
        { filename: 'package-lock.json', additions: 500, deletions: 100, status: 'modified' },
        { filename: 'node_modules/lib/index.js', additions: 200, deletions: 0, status: 'added' },
      ];

      vi.mocked(fs.stat).mockResolvedValue(createMockStats(1000));

      mockExecAsync.mockResolvedValue({
        stdout: '     100 file',
        stderr: '',
      });

      const result = await analyzeFiles(files, config, 'token', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metrics.totalFiles).toBe(3);
        expect(result.value.metrics.filesAnalyzed).toHaveLength(1);
        expect(result.value.metrics.filesExcluded).toHaveLength(2);
        expect(result.value.metrics.filesExcluded).toContain('package-lock.json');
        expect(result.value.metrics.filesExcluded).toContain('node_modules/lib/index.js');
      }
    });

    it('should skip binary files', async () => {
      const files: DiffFile[] = [
        { filename: 'src/index.ts', additions: 100, deletions: 20, status: 'modified' },
        { filename: 'assets/logo.png', additions: 0, deletions: 0, status: 'added' },
        { filename: 'fonts/icon.woff', additions: 0, deletions: 0, status: 'added' }, // Using .woff instead of .wasm (wasm is in default exclude patterns)
      ];

      vi.mocked(fs.stat).mockResolvedValue(createMockStats(1000));

      mockExecAsync.mockResolvedValue({
        stdout: '     100 file',
        stderr: '',
      });

      const result = await analyzeFiles(files, config, 'token', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metrics.filesAnalyzed).toHaveLength(1);
        expect(result.value.metrics.filesSkippedBinary).toHaveLength(2);
        expect(result.value.metrics.filesSkippedBinary).toContain('assets/logo.png');
        expect(result.value.metrics.filesSkippedBinary).toContain('fonts/icon.woff');
      }
    });

    it('should detect violations', async () => {
      const files: DiffFile[] = [
        { filename: 'src/large.ts', additions: 1000, deletions: 0, status: 'added' },
        { filename: 'src/normal.ts', additions: 100, deletions: 20, status: 'modified' },
      ];

      vi.mocked(fs.stat).mockImplementation(path => {
        const sizes: Record<string, number> = {
          'src/large.ts': 2000000, // 2MB - exceeds limit
          'src/normal.ts': 5000,
        };
        return Promise.resolve(createMockStats(sizes[path as string] || 1000));
      });

      mockExecAsync.mockImplementation((command: string, args?: readonly string[]) => {
        if (command === 'wc' && args?.[0] === '-l') {
          if (args[1] === 'src/large.ts') {
            return Promise.resolve({
              stdout: '     2000 src/large.ts', // Exceeds line limit
              stderr: '',
            });
          }
          return Promise.resolve({
            stdout: '     100 file',
            stderr: '',
          });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const smallConfig = {
        ...config,
        fileSizeLimit: 1000000, // 1MB
        fileLineLimit: 1000,
        maxAddedLines: 500, // Will be exceeded
      };

      const result = await analyzeFiles(files, smallConfig, 'token', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Check violations
        expect(result.value.violations.largeFiles).toHaveLength(1);
        expect(result.value.violations.largeFiles[0]?.file).toBe('src/large.ts');
        expect(result.value.violations.exceedsFileLines).toHaveLength(1);
        expect(result.value.violations.exceedsAdditions).toBe(true); // 1100 > 500
        expect(result.value.violations.exceedsFileCount).toBe(false);
      }
    });

    it('should handle analysis errors gracefully', async () => {
      const files: DiffFile[] = [
        { filename: 'src/error.ts', additions: 100, deletions: 20, status: 'modified' },
        { filename: 'src/ok.ts', additions: 50, deletions: 10, status: 'modified' },
      ];

      vi.mocked(fs.stat).mockImplementation(path => {
        if (path === 'src/error.ts') {
          return Promise.reject(new Error('Permission denied'));
        }
        return Promise.resolve(createMockStats(1000));
      });

      mockExecAsync.mockImplementation((command: string, args?: readonly string[]) => {
        if (command === 'wc' && args?.[0] === '-l') {
          if (args[1] === 'src/error.ts') {
            return Promise.reject(new Error('File not found'));
          }
          return Promise.resolve({
            stdout: '     100 file',
            stderr: '',
          });
        }
        return Promise.reject(new Error('Unknown command'));
      });

      const result = await analyzeFiles(files, config, 'token', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should continue with files that can be analyzed
        expect(result.value.metrics.filesAnalyzed).toHaveLength(1);
        expect(result.value.metrics.filesWithErrors).toHaveLength(1);
        expect(result.value.metrics.filesWithErrors).toContain('src/error.ts');
        expect(result.value.metrics.excludedAdditions).toBe(100); // Errors are tracked separately
        expect(result.value.metrics.totalAdditions).toBe(50); // Only successful files (errors excluded from totals)
      }
    });

    it('should handle empty file list', async () => {
      const result = await analyzeFiles([], config, 'token', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.metrics.totalFiles).toBe(0);
        expect(result.value.metrics.filesAnalyzed).toHaveLength(0);
        expect(result.value.violations.largeFiles).toHaveLength(0);
        expect(result.value.violations.exceedsAdditions).toBe(false);
      }
    });

    it('should enforce max file count limit', async () => {
      const manyFiles: DiffFile[] = Array.from({ length: 150 }, (_, i) => ({
        filename: `src/file${i}.ts`,
        additions: 10,
        deletions: 5,
        status: 'modified' as const,
      }));

      vi.mocked(fs.stat).mockResolvedValue(createMockStats(1000));

      mockExecAsync.mockResolvedValue({
        stdout: '     100 file',
        stderr: '',
      });

      const result = await analyzeFiles(manyFiles, config, 'token', context);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.violations.exceedsFileCount).toBe(true);
        // Should still analyze up to maxFileCount
        expect(result.value.metrics.filesAnalyzed.length).toBeLessThanOrEqual(100);
      }
    });
  });
});
