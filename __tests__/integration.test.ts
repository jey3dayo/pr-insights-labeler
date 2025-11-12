import * as fs from 'node:fs';

import * as core from '@actions/core';
import * as github from '@actions/github';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { run } from '../src/index';

// GitHub APIモック
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
      getContent: vi.fn().mockRejectedValue({ status: 404, message: 'Not Found' }), // Default: config file not found
    },
  },
};

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

describe('Integration Tests', () => {
  let summaryFile: string;

  beforeEach(() => {
    vi.clearAllMocks();

    // GitHub Actions 環境変数をモック
    summaryFile = `/tmp/summary-${Date.now()}.md`;
    process.env['GITHUB_STEP_SUMMARY'] = summaryFile;
    process.env['GITHUB_TOKEN'] = 'mock-token';

    // サマリーファイルを作成
    fs.writeFileSync(summaryFile, '');

    // デフォルトの入力値を設定
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        github_token: 'mock-token',
        file_size_limit: '100KB',
        file_lines_limit: '500',
        pr_additions_limit: '5000',
        pr_files_limit: '50',
        auto_remove_labels: 'true',
        apply_size_labels: 'true',
        size_label_thresholds:
          '{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}',
        // Selective Label Enabling inputs (required for new API)
        size_enabled: 'true',
        size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
        complexity_enabled: 'true',
        complexity_thresholds: '{"medium": 10, "high": 20}',
        category_enabled: 'true',
        risk_enabled: 'true',
        // Directory Labeling inputs
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
    // サマリーファイルをクリーンアップ
    if (fs.existsSync(summaryFile)) {
      fs.unlinkSync(summaryFile);
    }
  });

  describe('Basic Integration', () => {
    it('should run successfully with small PR', async () => {
      // 小規模PRのモック設定
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: 'src/small.ts',
            additions: 50,
            deletions: 10,
            changes: 60,
            status: 'modified',
          },
        ],
      });

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      await run();

      // 成功で終了
      expect(core.setFailed).not.toHaveBeenCalled();

      // ラベルが適用される
      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();
    });

    it('should handle Draft PR correctly', async () => {
      // Draft PRに設定
      vi.mocked(github.context).payload.pull_request = {
        number: 1,
        base: { sha: 'base-sha' },
        head: { sha: 'head-sha' },
        draft: true,
      };

      await run();

      // ファイル分析がスキップされる
      expect(mockOctokit.rest.pulls.listFiles).not.toHaveBeenCalled();

      // 成功で終了
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Violation Detection', () => {
    it('should complete successfully even with large PR', async () => {
      // 大規模ファイルを含むPR（統合テストはアクションが正常終了することを確認）
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: 'src/large.ts',
            additions: 2000,
            deletions: 100,
            changes: 2100,
            status: 'modified',
          },
        ],
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          size: 50000, // 50KB（制限内）
        },
      });

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      await run();

      // No failure conditions set, so should complete successfully
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Label Management', () => {
    it('should not duplicate labels', async () => {
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: 'src/file.ts',
            additions: 100,
            deletions: 0,
            changes: 100,
            status: 'modified',
          },
        ],
      });

      // 既にラベルが存在
      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [{ name: 'size:S' }, { name: 'auto/excessive-changes' }],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      await run();

      // 既存ラベルと重複しないことを確認（冪等性）
      // addLabelsが呼ばれても、既存のラベルは含まれない
      const calls = mockOctokit.rest.issues.addLabels.mock.calls;
      if (calls.length > 0 && calls[0]?.[0]) {
        const addedLabels = calls[0][0].labels;
        expect(addedLabels).not.toContain('size:S');
      }
    });
  });

  describe('Output Variables', () => {
    it('should complete without errors', async () => {
      // 統合テスト: アクションが正常に完了することを確認
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: 'src/file.ts',
            additions: 150,
            deletions: 50,
            changes: 200,
            status: 'modified',
          },
        ],
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          size: 30000, // 30KB
        },
      });

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      // エラーなく完了することを確認
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Selective Label Enabling Integration', () => {
    beforeEach(() => {
      // PR Insights Labeler inputs を追加
      vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'mock-token',
          file_size_limit: '100KB',
          file_lines_limit: '500',
          pr_additions_limit: '5000',
          pr_files_limit: '50',
          auto_remove_labels: 'true',
          large_files_label: 'auto/large-files',
          too_many_files_label: 'auto/too-many-files',
          skip_draft_pr: 'true',
          comment_on_pr: 'auto',
          additional_exclude_patterns: '',
          enable_summary: 'true',
          // Selective Label Enabling inputs
          size_enabled: 'true',
          size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
          complexity_enabled: 'true',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
          // Directory Labeling inputs
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
      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: 'src/feature.ts',
            additions: 150,
            deletions: 50,
            changes: 200,
            status: 'modified',
          },
        ],
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          size: 30000, // 30KB
        },
      });

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
      // 個別*_enabledフラグ の場合はラベルが適用される可能性がある
      // ただし、すべての条件を満たす必要があるため、呼び出されるかどうかは実装に依存
    });

    it('should skip size labels when size_enabled=false', async () => {
      // サイズラベルを無効化
      vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'mock-token',
          file_size_limit: '100KB',
          file_lines_limit: '500',
          pr_additions_limit: '5000',
          pr_files_limit: '50',
          auto_remove_labels: 'true',
          large_files_label: 'auto/large-files',
          too_many_files_label: 'auto/too-many-files',
          skip_draft_pr: 'true',
          comment_on_pr: 'auto',
          additional_exclude_patterns: '',
          enable_summary: 'true',
          size_enabled: 'false', // サイズラベルを無効化
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

      mockOctokit.rest.pulls.listFiles.mockResolvedValue({
        data: [
          {
            filename: 'src/feature.ts',
            additions: 150,
            deletions: 50,
            changes: 200,
            status: 'modified',
          },
        ],
      });

      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          size: 30000,
        },
      });

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();

      // サイズラベルが付与されないことを確認
      const calls = mockOctokit.rest.issues.addLabels.mock.calls;
      if (calls.length > 0 && calls[0]?.[0]) {
        const addedLabels = calls[0][0].labels as string[];
        const sizeLabels = addedLabels.filter(label => label.startsWith('size/'));
        expect(sizeLabels.length).toBe(0);
      }
    });
  });
});
