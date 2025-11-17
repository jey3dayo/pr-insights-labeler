/**
 * Directory-Based Labeler: 統合テスト
 *
 * 要件定義書の受け入れテストケースに基づいた統合テスト
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { loadDirectoryLabelerConfig } from '../../src/directory-labeler/config-loader.js';
import { decideLabelsForFiles } from '../../src/directory-labeler/decision-engine.js';
import { applyDirectoryLabels } from '../../src/directory-labeler/label-applicator.js';
import { DEFAULT_NAMESPACES } from '../../src/directory-labeler/types.js';
import { createMockOctokit, type MockOctokit } from './mock-octokit';

describe('Directory-Based Labeler: Integration Tests', () => {
  let tempDir: string;
  let configPath: string;
  let mockOctokit: MockOctokit;
  const context = {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    issue: { number: 123 },
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dir-labeler-integration-'));
    configPath = path.join(tempDir, 'directory-labeler.yml');

    mockOctokit = createMockOctokit();
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('シナリオ1: 単一マッチ', async () => {
    const config = `
version: 1
rules:
  - label: "area:components"
    include:
      - "src/components/**"
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      const files = ['src/components/Button.tsx'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        expect(decisionsResult.value).toHaveLength(1);
        expect(decisionsResult.value[0]?.label).toBe('area:components');
      }
    }
  });

  test('シナリオ2: 複数マッチ（加法的）', async () => {
    const config = `
version: 1
rules:
  - label: "area:components"
    include:
      - "src/components/**"
  - label: "area:utils"
    include:
      - "src/utils/**"
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      const files = ['src/components/Button.tsx', 'src/utils/format.ts'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        expect(decisionsResult.value).toHaveLength(2);

        const labels = decisionsResult.value.map(d => d.label);
        expect(labels).toContain('area:components');
        expect(labels).toContain('area:utils');
      }
    }
  });

  test('シナリオ3: 競合（相互排他）- exclusive名前空間で既存ラベルを削除', async () => {
    const config = `
version: 1
rules:
  - label: "size:M"
    include:
      - "**/*"
namespaces:
  exclusive:
    - "size"
  additive:
    - "meta"
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      const files = ['src/large-file.ts'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
          data: [{ name: 'size:S' }], // 既存ラベル
        });
        mockOctokit.rest.issues.removeLabel.mockResolvedValue({ data: {} });
        mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

        const applyResult = await applyDirectoryLabels(
          mockOctokit as never,
          context,
          decisionsResult.value,
          configResult.value.namespaces || DEFAULT_NAMESPACES,
        );

        expect(applyResult.isOk()).toBe(true);
        if (applyResult.isOk()) {
          expect(applyResult.value.removed).toContain('size:S');
          expect(applyResult.value.applied).toContain('size:M');
        }
      }
    }
  });

  test('シナリオ4: 除外優先', async () => {
    const config = `
version: 1
rules:
  - label: "area:components"
    include:
      - "src/components/**"
    exclude:
      - "**/__tests__/**"
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      const files = ['src/components/__tests__/Button.test.tsx'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        expect(decisionsResult.value).toHaveLength(0); // 除外されるため、ラベルなし
      }
    }
  });

  test('シナリオ5: 除外のみ変更', async () => {
    const config = `
version: 1
rules:
  - label: "area:src"
    include:
      - "src/**"
    exclude:
      - "**/__tests__/**"
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      const files = ['src/__tests__/test.ts'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        expect(decisionsResult.value).toHaveLength(0);
      }
    }
  });

  test('シナリオ7: 既存ラベル重複（冪等性）', async () => {
    const config = `
version: 1
rules:
  - label: "area:components"
    include:
      - "src/components/**"
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      const files = ['src/components/Button.tsx'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
          data: [{ name: 'area:components' }], // 既に同じラベルが存在
        });

        const applyResult = await applyDirectoryLabels(
          mockOctokit as never,
          context,
          decisionsResult.value,
          DEFAULT_NAMESPACES,
        );

        expect(applyResult.isOk()).toBe(true);
        if (applyResult.isOk()) {
          expect(applyResult.value.skipped).toContain('area:components');
          expect(applyResult.value.applied).toHaveLength(0);
        }

        // APIは呼び出されない（冪等性）
        expect(mockOctokit.rest.issues.addLabels).not.toHaveBeenCalled();
      }
    }
  });

  test('シナリオ10: パターン優先度', async () => {
    const config = `
version: 1
rules:
  - label: "area:components"
    include:
      - "src/components/**"
    priority: 10
  - label: "area:core"
    include:
      - "src/components/core/**"
    priority: 50
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      const files = ['src/components/core/Button.tsx'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        expect(decisionsResult.value).toHaveLength(1);
        expect(decisionsResult.value[0]?.label).toBe('area:core'); // 優先度50 > 10
      }
    }
  });

  test('シナリオ14: 既定除外のみ変更', async () => {
    const config = `
version: 1
rules:
  - label: "all"
    include:
      - "**/*"
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      // デフォルト除外パターンに該当するファイルのみ
      const files = ['.git/config', 'node_modules/package/index.js'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        expect(decisionsResult.value).toHaveLength(0); // 除外されるため、ラベルなし
      }
    }
  });

  test('エンドツーエンド: Config読み込み → ラベル決定 → ラベル適用', async () => {
    const config = `
version: 1
options:
  dot: true
  nocase: false
rules:
  - label: "area:frontend"
    include:
      - "src/components/**"
      - "src/pages/**"
    priority: 20
  - label: "area:backend"
    include:
      - "src/api/**"
      - "src/services/**"
    priority: 20
  - label: "area:tests"
    include:
      - "**/__tests__/**"
      - "**/*.test.ts"
    exclude:
      - "**/__snapshots__/**"
    priority: 10
namespaces:
  exclusive:
    - "area"
  additive:
    - "meta"
`;
    fs.writeFileSync(configPath, config, 'utf-8');

    // Step 1: 設定読み込み
    const configResult = loadDirectoryLabelerConfig(configPath);
    expect(configResult.isOk()).toBe(true);

    if (configResult.isOk()) {
      // Step 2: ラベル決定
      const files = ['src/components/Button.tsx', 'src/api/handler.ts', 'src/components/__tests__/Button.test.tsx'];
      const decisionsResult = decideLabelsForFiles(files, configResult.value);

      expect(decisionsResult.isOk()).toBe(true);
      if (decisionsResult.isOk()) {
        const decisions = decisionsResult.value;
        expect(decisions.length).toBeGreaterThan(0);

        // area:frontend と area:backend が決定される（テストファイルは除外またはarea:testsになる可能性）
        const labels = decisions.map(d => d.label);
        expect(labels).toContain('area:frontend');
        expect(labels).toContain('area:backend');

        // Step 3: ラベル適用
        mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
          data: [],
        });
        mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

        const applyResult = await applyDirectoryLabels(
          mockOctokit as never,
          context,
          decisions,
          configResult.value.namespaces || DEFAULT_NAMESPACES,
        );

        expect(applyResult.isOk()).toBe(true);
        if (applyResult.isOk()) {
          expect(applyResult.value.applied.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
