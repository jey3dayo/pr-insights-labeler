import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process');
vi.mock('util', () => {
  const mockFn = vi.fn();
  return {
    promisify: vi.fn(() => mockFn),
  };
});
vi.mock('@actions/github');
vi.mock('@actions/core');

import { promisify } from 'node:util';

import * as core from '@actions/core';
import * as github from '@actions/github';

import { getDiffFiles } from '../src/diff-strategy';
import { initializeI18n, resetI18n } from '../src/i18n.js';

describe('DiffStrategy', () => {
  let mockExecAsync: ReturnType<typeof vi.fn>;
  let mockListFiles: ReturnType<typeof vi.fn>;
  let mockOctokit: any;

  beforeEach(() => {
    vi.clearAllMocks();

    const originalLang = process.env['LANG'];
    const originalLanguage = process.env['LANGUAGE'];
    delete process.env['LANG'];
    delete process.env['LANGUAGE'];

    resetI18n();
    initializeI18n('en');

    if (originalLang) {
      process.env['LANG'] = originalLang;
    }
    if (originalLanguage) {
      process.env['LANGUAGE'] = originalLanguage;
    }

    mockExecAsync = (promisify as unknown as () => ReturnType<typeof vi.fn>)();

    mockListFiles = vi.fn();
    mockOctokit = {
      rest: {
        pulls: {
          listFiles: mockListFiles,
        },
      },
    };

    vi.mocked(github.getOctokit).mockReturnValue(mockOctokit);

    vi.mocked(core.debug).mockImplementation(() => {});
    vi.mocked(core.info).mockImplementation(() => {});
    vi.mocked(core.warning).mockImplementation(() => {});
    vi.mocked(core.error).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getDiffFiles', () => {
    const context = {
      owner: 'test-owner',
      repo: 'test-repo',
      pullNumber: 123,
      baseSha: 'base-sha',
      headSha: 'head-sha',
    };

    it('should use local git strategy when available', async () => {
      const gitOutput = `100\t0\tsrc/file1.ts
50\t10\tsrc/file2.ts
0\t0\tsrc/file3.md`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(3);
        expect(result.value.files[0]).toEqual({
          filename: 'src/file1.ts',
          additions: 100,
          deletions: 0,
          status: 'added',
        });
        expect(result.value.files[1]).toEqual({
          filename: 'src/file2.ts',
          additions: 50,
          deletions: 10,
          status: 'modified',
        });
        expect(result.value.files[2]).toEqual({
          filename: 'src/file3.md',
          additions: 0,
          deletions: 0,
          status: 'renamed',
        });
        expect(result.value.strategy).toBe('local-git');
      }
    });

    it('should fallback to GitHub API when local git fails', async () => {
      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      mockListFiles
        .mockResolvedValueOnce({
          data: [
            {
              filename: 'api/file1.ts',
              additions: 200,
              deletions: 50,
              status: 'modified',
            },
            {
              filename: 'api/file2.ts',
              additions: 100,
              deletions: 0,
              status: 'added',
            },
          ],
        })
        .mockResolvedValueOnce({ data: [] });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(2);
        expect(result.value.files[0]?.filename).toBe('api/file1.ts');
        expect(result.value.strategy).toBe('github-api');
      }
    });

    it('should handle pagination for GitHub API', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        filename: `file${i}.ts`,
        additions: 10,
        deletions: 5,
        status: 'modified' as const,
      }));

      const page2 = Array.from({ length: 50 }, (_, i) => ({
        filename: `file${i + 100}.ts`,
        additions: 20,
        deletions: 10,
        status: 'modified' as const,
      }));

      mockExecAsync.mockRejectedValue(new Error('Command not found'));

      mockListFiles
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 })
        .mockResolvedValueOnce({ data: [] });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(150);
        expect(mockListFiles).toHaveBeenCalledTimes(3);
      }
    });

    it('should filter out removed files', async () => {
      const gitOutput = `100\t0\tsrc/added.ts
50\t10\tsrc/modified.ts
0\t100\tsrc/removed.ts
10\t0\tsrc/renamed.ts`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(3);
        const filenames = result.value.files.map(f => f.filename);
        expect(filenames).not.toContain('src/removed.ts');
      }
    });

    it('should return DiffError when both strategies fail', async () => {
      mockExecAsync.mockRejectedValue(new Error('Git command failed'));
      mockListFiles.mockRejectedValue(new Error('API error'));

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('DiffError');
        expect(result.error.message).toContain('Failed to get diff');
      }
    });

    it('should handle empty diff', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(0);
        expect(result.value.strategy).toBe('local-git');
      }
    });

    it('should parse git diff with various statuses correctly', async () => {
      const gitOutput = `100\t0\tsrc/added.ts
0\t0\tsrc/renamed.ts
50\t20\tsrc/modified.ts
30\t30\tsrc/changed.ts`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const files = result.value.files;
        expect(files[0]?.status).toBe('added');
        expect(files[1]?.status).toBe('renamed');
        expect(files[2]?.status).toBe('modified');
        expect(files[3]?.status).toBe('modified');
      }
    });

    it('should handle malformed git output gracefully', async () => {
      const gitOutput = `100\t0\tsrc/valid.ts
invalid line
50\tsrc/missing-field.ts
\t\t
100\t0\tsrc/another-valid.ts`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(2);
        expect(result.value.files[0]?.filename).toBe('src/valid.ts');
        expect(result.value.files[1]?.filename).toBe('src/another-valid.ts');
      }
    });

    it('should handle rename format {old => new} correctly', async () => {
      const gitOutput = `141\t0\tsrc/{pattern-matcher.ts => configs/default-excludes.ts}
50\t30\t{old-file.ts => new-file.ts}
100\t0\tpath/to/{old.ts => new.ts}
20\t10\tregular-file.ts`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(4);

        expect(result.value.files[0]?.filename).toBe('src/configs/default-excludes.ts');
        expect(result.value.files[0]?.additions).toBe(141);
        expect(result.value.files[0]?.deletions).toBe(0);

        expect(result.value.files[1]?.filename).toBe('new-file.ts');
        expect(result.value.files[1]?.additions).toBe(50);
        expect(result.value.files[1]?.deletions).toBe(30);

        expect(result.value.files[2]?.filename).toBe('path/to/new.ts');
        expect(result.value.files[2]?.additions).toBe(100);
        expect(result.value.files[2]?.deletions).toBe(0);

        expect(result.value.files[3]?.filename).toBe('regular-file.ts');
        expect(result.value.files[3]?.additions).toBe(20);
        expect(result.value.files[3]?.deletions).toBe(10);
      }
    });

    it('should handle rename format with empty old name { => new}', async () => {
      const gitOutput = `10\t5\tsrc/app/{ => (dashboard)}/dashboard/DashboardClient.tsx`;

      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(1);
        expect(result.value.files[0]?.filename).toBe('src/app/(dashboard)/dashboard/DashboardClient.tsx');
        expect(result.value.files[0]?.additions).toBe(10);
        expect(result.value.files[0]?.deletions).toBe(5);
      }
    });

    it('should use correct git command with diff-filter', async () => {
      const gitOutput = '10\t0\tfile.ts';
      mockExecAsync.mockResolvedValue({
        stdout: gitOutput,
        stderr: '',
      });

      await getDiffFiles(context, 'test-token');

      expect(mockExecAsync).toHaveBeenCalledWith(
        'git',
        ['diff', '--numstat', '-M', '-C', '--diff-filter=ACMR', `${context.baseSha}...${context.headSha}`],
        expect.objectContaining({
          cwd: expect.any(String),
          maxBuffer: 16 * 1024 * 1024,
        }),
      );
    });

    it('should handle GitHub API with removed files', async () => {
      mockExecAsync.mockRejectedValue(new Error('Git not available'));

      mockListFiles
        .mockResolvedValueOnce({
          data: [
            {
              filename: 'file1.ts',
              additions: 100,
              deletions: 0,
              status: 'added',
            },
            {
              filename: 'file2.ts',
              additions: 0,
              deletions: 100,
              status: 'removed',
            },
            {
              filename: 'file3.ts',
              additions: 50,
              deletions: 10,
              status: 'modified',
            },
          ],
        })
        .mockResolvedValueOnce({ data: [] });

      const result = await getDiffFiles(context, 'test-token');

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.files).toHaveLength(2);
        const filenames = result.value.files.map(f => f.filename);
        expect(filenames).not.toContain('file2.ts');
      }
    });
  });
});
