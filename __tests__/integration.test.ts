import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import * as core from '@actions/core';
import * as github from '@actions/github';
import { okAsync } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { run } from '../src/index';
import type { ComplexityMetrics } from '../src/labeler-types';

const FAKE_COMPLEXITY_METRICS: ComplexityMetrics = {
  maxComplexity: 5,
  avgComplexity: 5,
  analyzedFiles: 1,
  files: [{ path: 'src/file.ts', complexity: 5, functions: [] }],
  skippedFiles: [],
  syntaxErrorFiles: [],
  truncated: false,
  hasTsconfig: false,
};

vi.mock('../src/complexity-analyzer', () => ({
  createComplexityAnalyzer: () => ({
    analyzeFile: vi.fn(),
    analyzeFiles: vi.fn(() => okAsync(FAKE_COMPLEXITY_METRICS)),
  }),
}));

const mockOctokit = {
  rest: {
    pulls: {
      listFiles: vi.fn(),
      get: vi.fn(),
    },
    issues: {
      addLabels: vi.fn(),
      removeLabel: vi.fn(),
      listLabelsOnIssue: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      listComments: vi.fn(),
    },
    repos: {
      getContent: vi.fn().mockRejectedValue({ status: 404, message: 'Not Found' }),
    },
  },
};

function mockListFilesSinglePage(data: unknown[]): void {
  mockOctokit.rest.pulls.listFiles.mockImplementation(async ({ page }: { page: number }) =>
    page === 1 ? { data } : { data: [] },
  );
}

vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    issue: { number: 1 },
    payload: {
      pull_request: {
        number: 1,
        base: { sha: 'base-sha' },
        head: { sha: 'head-sha' },
        draft: false,
      },
    },
  },
  getOctokit: vi.fn(() => mockOctokit),
}));

const FIXTURE_FILENAMES = ['small.ts', 'large.ts', 'file.ts', 'feature.ts'];

describe('Integration Tests', () => {
  let summaryFile: string;
  let fixtureDir: string;

  beforeEach(() => {
    vi.clearAllMocks();

    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-insights-labeler-integration-'));
    fs.mkdirSync(path.join(fixtureDir, 'src'), { recursive: true });
    const fixtureContent = 'export function sample(): number {\n  return 1;\n}\n';
    for (const name of FIXTURE_FILENAMES) {
      fs.writeFileSync(path.join(fixtureDir, 'src', name), fixtureContent);
    }
    process.env['GITHUB_WORKSPACE'] = fixtureDir;

    vi.mocked(github.context).payload.pull_request = {
      number: 1,
      base: { sha: 'base-sha' },
      head: { sha: 'head-sha' },
      draft: false,
    };

    summaryFile = `/tmp/summary-${Date.now()}.md`;
    process.env['GITHUB_STEP_SUMMARY'] = summaryFile;
    process.env['GITHUB_TOKEN'] = 'mock-token';

    fs.writeFileSync(summaryFile, '');

    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        github_token: 'mock-token',
        file_size_limit: '100KB',
        file_size_limit_enabled: 'true',
        file_lines_limit: '500',
        file_lines_limit_enabled: 'true',
        pr_additions_limit: '5000',
        pr_additions_limit_enabled: 'true',
        pr_files_limit: '50',
        pr_files_limit_enabled: 'true',
        apply_size_labels: 'true',
        size_label_thresholds:
          '{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}',
        size_enabled: 'true',
        size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
        complexity_enabled: 'true',
        complexity_thresholds: '{"medium": 10, "high": 20}',
        category_enabled: 'true',
        risk_enabled: 'true',
        enable_directory_labeling: 'false',
        directory_labeler_config_path: '.github/directory-labeler.yml',
        auto_create_labels: 'false',
        label_color: 'cccccc',
        label_description: '',
        max_labels: '10',
        use_default_excludes: 'true',
        large_files_label: 'auto/large-files',
        too_many_files_label: 'auto/too-many-files',
        skip_draft_pr: 'true',
        comment_on_pr: 'auto',
        additional_exclude_patterns: '',
        enable_summary: 'true',
      };
      return inputs[name] || '';
    });

    vi.spyOn(core, 'setOutput').mockImplementation(() => {});
    vi.spyOn(core, 'setFailed').mockImplementation(() => {});
    vi.spyOn(core, 'info').mockImplementation(() => {});
    vi.spyOn(core, 'warning').mockImplementation(() => {});
    vi.spyOn(core, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    if (fs.existsSync(summaryFile)) {
      fs.unlinkSync(summaryFile);
    }

    delete process.env['GITHUB_WORKSPACE'];
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  describe('Basic Integration', () => {
    it('should run successfully with small PR', async () => {
      mockListFilesSinglePage([
        {
          filename: 'src/small.ts',
          additions: 50,
          deletions: 10,
          changes: 60,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();

      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();
    }, 30000);

    it('should handle Draft PR correctly', async () => {
      vi.mocked(github.context).payload.pull_request = {
        number: 1,
        base: { sha: 'base-sha' },
        head: { sha: 'head-sha' },
        draft: true,
      };

      await run();

      expect(mockOctokit.rest.pulls.listFiles).not.toHaveBeenCalled();

      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Violation Detection', () => {
    it('should complete successfully even with large PR', async () => {
      mockListFilesSinglePage([
        {
          filename: 'src/large.ts',
          additions: 2000,
          deletions: 100,
          changes: 2100,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Label Management', () => {
    it('should not duplicate labels', async () => {
      mockListFilesSinglePage([
        {
          filename: 'src/file.ts',
          additions: 100,
          deletions: 0,
          changes: 100,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [{ name: 'size:S' }, { name: 'auto/excessive-changes' }],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      await run();

      const calls = mockOctokit.rest.issues.addLabels.mock.calls;
      if (calls.length > 0 && calls[0]?.[0]) {
        const addedLabels = calls[0][0].labels;
        expect(addedLabels).not.toContain('size:S');
      }
    });
  });

  describe('Output Variables', () => {
    it('should complete without errors', async () => {
      mockListFilesSinglePage([
        {
          filename: 'src/file.ts',
          additions: 150,
          deletions: 50,
          changes: 200,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Selective Label Enabling Integration', () => {
    beforeEach(() => {
      vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'mock-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '500',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '50',
          pr_files_limit_enabled: 'true',
          large_files_label: 'auto/large-files',
          too_many_files_label: 'auto/too-many-files',
          skip_draft_pr: 'true',
          comment_on_pr: 'auto',
          additional_exclude_patterns: '',
          enable_summary: 'true',
          size_enabled: 'true',
          size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
          complexity_enabled: 'true',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
          enable_directory_labeling: 'false',
          directory_labeler_config_path: '.github/directory-labeler.yml',
          auto_create_labels: 'false',
          label_color: 'cccccc',
          label_description: '',
          max_labels: '10',
          use_default_excludes: 'true',
        };
        return inputs[name] || '';
      });
    });

    it('should work with all label types enabled', async () => {
      mockListFilesSinglePage([
        {
          filename: 'src/feature.ts',
          additions: 150,
          deletions: 50,
          changes: 200,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
    });

    it('should skip size labels when size_enabled=false', async () => {
      vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'mock-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '500',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '50',
          pr_files_limit_enabled: 'true',
          large_files_label: 'auto/large-files',
          too_many_files_label: 'auto/too-many-files',
          skip_draft_pr: 'true',
          comment_on_pr: 'auto',
          additional_exclude_patterns: '',
          enable_summary: 'true',
          size_enabled: 'false',
          size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
          complexity_enabled: 'true',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
          enable_directory_labeling: 'false',
          directory_labeler_config_path: '.github/directory-labeler.yml',
          auto_create_labels: 'false',
          label_color: 'cccccc',
          label_description: '',
          max_labels: '10',
          use_default_excludes: 'true',
        };
        return inputs[name] || '';
      });

      mockListFilesSinglePage([
        {
          filename: 'src/feature.ts',
          additions: 150,
          deletions: 50,
          changes: 200,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();

      const calls = mockOctokit.rest.issues.addLabels.mock.calls;
      if (calls.length > 0 && calls[0]?.[0]) {
        const addedLabels = calls[0][0].labels as string[];
        const sizeLabels = addedLabels.filter(label => label.startsWith('size/'));
        expect(sizeLabels.length).toBe(0);
      }
    });
  });

  describe('Complexity Label Flow', () => {
    it('should carry the mocked complexity metrics through to the applied labels', async () => {
      vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'mock-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '500',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '50',
          pr_files_limit_enabled: 'true',
          apply_size_labels: 'true',
          size_label_thresholds:
            '{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}',
          size_enabled: 'true',
          size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
          complexity_enabled: 'true',
          complexity_thresholds: '{"medium": 2, "high": 5}',
          category_enabled: 'true',
          risk_enabled: 'true',
          enable_directory_labeling: 'false',
          directory_labeler_config_path: '.github/directory-labeler.yml',
          auto_create_labels: 'false',
          label_color: 'cccccc',
          label_description: '',
          max_labels: '10',
          use_default_excludes: 'true',
          large_files_label: 'auto/large-files',
          too_many_files_label: 'auto/too-many-files',
          skip_draft_pr: 'true',
          comment_on_pr: 'auto',
          additional_exclude_patterns: '',
          enable_summary: 'true',
        };
        return inputs[name] || '';
      });

      mockListFilesSinglePage([
        {
          filename: 'src/file.ts',
          additions: 50,
          deletions: 10,
          changes: 60,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404, message: 'Not Found' });
      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({ data: [] });
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] });
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();

      const allAddedLabels: string[] = mockOctokit.rest.issues.addLabels.mock.calls.flatMap(
        call => call[0]?.labels ?? [],
      );
      expect(allAddedLabels).toContain('complexity/high');

      expect(core.warning).not.toHaveBeenCalledWith(expect.stringContaining('Failed to analyze file'));
    });
  });
});
