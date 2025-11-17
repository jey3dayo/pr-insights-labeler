/**
 * Directory-Based Labeler: Label Applicatorのユニットテスト
 */

import { beforeEach, describe, expect, test } from 'vitest';

import type { LabelDecision } from '../../src/directory-labeler/decision-engine.js';
import { applyDirectoryLabels, type ApplyResult } from '../../src/directory-labeler/label-applicator.js';
import { DEFAULT_NAMESPACES, type NamespacePolicy } from '../../src/directory-labeler/types.js';
import { createMockOctokit, type MockOctokit } from './mock-octokit';

describe('Directory-Based Labeler: Label Applicator', () => {
  let mockOctokit: MockOctokit;
  const context = {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo',
    },
    issue: {
      number: 123,
    },
  };

  beforeEach(() => {
    mockOctokit = createMockOctokit();
  });

  describe('applyDirectoryLabels', () => {
    test('新しいラベルを追加（既存ラベルなし）', async () => {
      const decisions: LabelDecision[] = [
        {
          label: 'area:components',
          matchedPattern: 'src/components/**',
          matchedFiles: ['src/components/Button.tsx'],
          priority: 0,
          matchLength: 20,
        },
      ];

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      const result = await applyDirectoryLabels(mockOctokit as never, context, decisions, DEFAULT_NAMESPACES);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const applyResult: ApplyResult = result.value;
        expect(applyResult.applied).toContain('area:components');
        expect(applyResult.skipped).toHaveLength(0);
        expect(applyResult.failed).toHaveLength(0);
      }

      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        labels: ['area:components'],
      });
    });

    test('既存ラベルと重複（冪等性保証）', async () => {
      const decisions: LabelDecision[] = [
        {
          label: 'area:components',
          matchedPattern: 'src/components/**',
          matchedFiles: ['src/components/Button.tsx'],
          priority: 0,
          matchLength: 20,
        },
      ];

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [{ name: 'area:components' }],
      });
      const result = await applyDirectoryLabels(mockOctokit as never, context, decisions, DEFAULT_NAMESPACES);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const applyResult: ApplyResult = result.value;
        expect(applyResult.applied).toHaveLength(0);
        expect(applyResult.skipped).toContain('area:components');
        expect(applyResult.failed).toHaveLength(0);
      }

      expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled();
    });

    test('exclusive名前空間: 既存ラベルを削除して置換', async () => {
      const decisions: LabelDecision[] = [
        {
          label: 'area:utils',
          matchedPattern: 'src/utils/**',
          matchedFiles: ['src/utils/format.ts'],
          priority: 0,
          matchLength: 15,
        },
      ];

      const namespaces: Required<NamespacePolicy> = {
        exclusive: ['area'],
        additive: ['meta'],
      };

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [{ name: 'area:components' }, { name: 'meta:important' }],
      });
      mockOctokit.rest.issues.removeLabel.mockResolvedValue({ data: {} });
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      const result = await applyDirectoryLabels(mockOctokit as never, context, decisions, namespaces);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const applyResult: ApplyResult = result.value;
        expect(applyResult.applied).toContain('area:utils');
        expect(applyResult.removed).toContain('area:components');
      }

      expect(mockOctokit.rest.issues.removeLabel).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        name: 'area:components',
      });
      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        labels: ['area:utils'],
      });
    });

    test('additive名前空間: 既存ラベルを保持して追加', async () => {
      const decisions: LabelDecision[] = [
        {
          label: 'meta:reviewed',
          matchedPattern: '**/*',
          matchedFiles: ['src/index.ts'],
          priority: 0,
          matchLength: 10,
        },
      ];

      const namespaces: Required<NamespacePolicy> = {
        exclusive: ['area'],
        additive: ['meta'],
      };

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [{ name: 'meta:important' }, { name: 'area:components' }],
      });
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      const result = await applyDirectoryLabels(mockOctokit as never, context, decisions, namespaces);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const applyResult: ApplyResult = result.value;
        expect(applyResult.applied).toContain('meta:reviewed');
        expect(applyResult.removed).toHaveLength(0);
      }

      expect(mockOctokit.rest.issues.removeLabel).not.toHaveBeenCalled();
      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        issue_number: 123,
        labels: ['meta:reviewed'],
      });
    });

    test('名前空間未定義ラベルはadditiveとして扱う', async () => {
      const decisions: LabelDecision[] = [
        {
          label: 'bug',
          matchedPattern: '**/*',
          matchedFiles: ['src/index.ts'],
          priority: 0,
          matchLength: 10,
        },
      ];

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [{ name: 'feature' }],
      });
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      const result = await applyDirectoryLabels(mockOctokit as never, context, decisions, DEFAULT_NAMESPACES);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const applyResult: ApplyResult = result.value;
        expect(applyResult.applied).toContain('bug');
        expect(applyResult.removed).toHaveLength(0);
      }

      expect(mockOctokit.rest.issues.removeLabel).not.toHaveBeenCalled();
    });

    test('ラベルが未存在の場合に自動作成（固定値: color=cccccc, description=""）', async () => {
      const decisions: LabelDecision[] = [
        {
          label: 'area:new-module',
          matchedPattern: 'src/new-module/**',
          matchedFiles: ['src/new-module/index.ts'],
          priority: 0,
          matchLength: 20,
        },
      ];

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });
      // 1回目のaddLabels呼び出し（バッチ処理）で422エラー
      mockOctokit.rest.issues.addLabels.mockRejectedValueOnce({
        status: 422,
        message: 'Validation Failed',
      });
      // 2回目のaddLabels呼び出し（createMissingLabels内の個別処理）でも422エラー
      mockOctokit.rest.issues.addLabels.mockRejectedValueOnce({
        status: 422,
        message: 'Validation Failed',
      });
      // ラベル作成
      mockOctokit.rest.issues.createLabel.mockResolvedValue({
        data: { name: 'area:new-module', color: 'cccccc', description: '' },
      });
      // 3回目のaddLabels呼び出し（ラベル作成後の適用）で成功
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      const result = await applyDirectoryLabels(mockOctokit as never, context, decisions, DEFAULT_NAMESPACES);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const applyResult: ApplyResult = result.value;
        expect(applyResult.applied).toContain('area:new-module');
      }

      expect(mockOctokit.rest.issues.createLabel).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        name: 'area:new-module',
        color: 'cccccc',
        description: '',
      });
    });

    test('ラベル作成失敗時は部分失敗として記録', async () => {
      const decisions: LabelDecision[] = [
        {
          label: 'area:new-module',
          matchedPattern: 'src/new-module/**',
          matchedFiles: ['src/new-module/index.ts'],
          priority: 0,
          matchLength: 20,
        },
      ];

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });
      mockOctokit.rest.issues.addLabels.mockRejectedValue({
        status: 422,
        message: 'Validation Failed',
      });
      mockOctokit.rest.issues.createLabel.mockRejectedValue({
        status: 403,
        message: 'Permission denied',
      });
      const result = await applyDirectoryLabels(mockOctokit as never, context, decisions, DEFAULT_NAMESPACES);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const applyResult: ApplyResult = result.value;
        expect(applyResult.failed).toHaveLength(1);
        expect(applyResult.failed[0]?.label).toBe('area:new-module');
        expect(applyResult.failed[0]?.reason).toContain('Permission denied');
      }
    });

    test('空のdecisions配列は何もしない', async () => {
      const decisions: LabelDecision[] = [];

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });
      const result = await applyDirectoryLabels(mockOctokit as never, context, decisions, DEFAULT_NAMESPACES);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const applyResult: ApplyResult = result.value;
        expect(applyResult.applied).toHaveLength(0);
        expect(applyResult.skipped).toHaveLength(0);
        expect(applyResult.removed).toHaveLength(0);
      }

      expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled();
    });
  });
});
