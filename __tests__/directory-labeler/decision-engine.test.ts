import { describe, expect, test } from 'vitest';

import {
  decideLabelsForFiles,
  filterByMaxLabels,
  type LabelDecision,
} from '../../src/directory-labeler/decision-engine.js';
import type { DirectoryLabelerConfig } from '../../src/directory-labeler/types.js';

describe('Directory-Based Labeler: Decision Engine', () => {
  describe('decideLabelsForFiles', () => {
    test('単一ファイル、単一ルールマッチ', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'area:components',
            include: ['src/components/**'],
          },
        ],
      };

      const files = ['src/components/Button.tsx'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decisions = result.value;
        expect(decisions).toHaveLength(1);
        expect(decisions[0]?.label).toBe('area:components');
        expect(decisions[0]?.matchedFiles).toContain('src/components/Button.tsx');
      }
    });

    test('複数ファイル、同一ラベルに集約', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'area:components',
            include: ['src/components/**'],
          },
        ],
      };

      const files = ['src/components/Button.tsx', 'src/components/Input.tsx', 'src/components/Modal.tsx'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decisions = result.value;
        expect(decisions).toHaveLength(1);
        expect(decisions[0]?.label).toBe('area:components');
        expect(decisions[0]?.matchedFiles).toHaveLength(3);
      }
    });

    test('複数ファイル、複数ラベルに分散', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'area:components',
            include: ['src/components/**'],
          },
          {
            label: 'area:utils',
            include: ['src/utils/**'],
          },
        ],
      };

      const files = ['src/components/Button.tsx', 'src/utils/format.ts'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decisions = result.value;
        expect(decisions).toHaveLength(2);

        const componentDecision = decisions.find(d => d.label === 'area:components');
        const utilsDecision = decisions.find(d => d.label === 'area:utils');

        expect(componentDecision?.matchedFiles).toContain('src/components/Button.tsx');
        expect(utilsDecision?.matchedFiles).toContain('src/utils/format.ts');
      }
    });

    test('除外パターンで一部ファイルをスキップ', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'area:components',
            include: ['src/components/**'],
            exclude: ['src/components/**/__tests__/**'],
          },
        ],
      };

      const files = ['src/components/Button.tsx', 'src/components/__tests__/Button.test.tsx'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decisions = result.value;
        expect(decisions).toHaveLength(1);
        expect(decisions[0]?.matchedFiles).toHaveLength(1);
        expect(decisions[0]?.matchedFiles).toContain('src/components/Button.tsx');
        expect(decisions[0]?.matchedFiles).not.toContain('src/components/__tests__/Button.test.tsx');
      }
    });

    test('すべてのファイルが除外された場合は空配列を返す', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'area:components',
            include: ['src/components/**'],
            exclude: ['src/components/**/__tests__/**'],
          },
        ],
      };

      const files = ['src/components/__tests__/Button.test.tsx'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    test('優先度が高いルールが選ばれる', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'area:components',
            include: ['src/components/**'],
            priority: 10,
          },
          {
            label: 'area:core',
            include: ['src/components/core/**'],
            priority: 50,
          },
        ],
      };

      const files = ['src/components/core/Button.tsx'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decisions = result.value;
        expect(decisions).toHaveLength(1);
        expect(decisions[0]?.label).toBe('area:core');
      }
    });

    test('最長マッチでルールが選ばれる（priority未指定）', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'area:src',
            include: ['src/**'],
          },
          {
            label: 'area:components',
            include: ['src/components/**'],
          },
        ],
      };

      const files = ['src/components/Button.tsx'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decisions = result.value;
        expect(decisions).toHaveLength(1);
        expect(decisions[0]?.label).toBe('area:components');
      }
    });

    test('空のファイルリストは空配列を返す', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'area:components',
            include: ['src/components/**'],
          },
        ],
      };

      const files: string[] = [];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    test('ルールが空の場合は空配列を返す', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [],
      };

      const files = ['src/components/Button.tsx'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    test('デフォルト除外パターンが適用される', () => {
      const config: DirectoryLabelerConfig = {
        version: 1,
        rules: [
          {
            label: 'all',
            include: ['**/*'],
          },
        ],
      };

      const files = ['src/index.ts', 'node_modules/package/index.js', 'package-lock.json'];

      const result = decideLabelsForFiles(files, config);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const decisions = result.value;
        expect(decisions).toHaveLength(1);
        expect(decisions[0]?.matchedFiles).toHaveLength(1);
        expect(decisions[0]?.matchedFiles).toContain('src/index.ts');
      }
    });
  });

  describe('filterByMaxLabels', () => {
    test('max_labels以下の場合はすべて選択', () => {
      const decisions: LabelDecision[] = [
        {
          label: 'area:components',
          matchedPattern: 'src/components/**',
          matchedFiles: ['src/components/Button.tsx'],
          priority: 0,
          matchLength: 20,
        },
        {
          label: 'area:utils',
          matchedPattern: 'src/utils/**',
          matchedFiles: ['src/utils/format.ts'],
          priority: 0,
          matchLength: 15,
        },
      ];

      const result = filterByMaxLabels(decisions, 10);

      expect(result.selected).toHaveLength(2);
      expect(result.rejected).toHaveLength(0);
    });

    test('max_labels超過時は優先度順に選択', () => {
      const decisions: LabelDecision[] = [
        {
          label: 'high-priority',
          matchedPattern: 'src/**',
          matchedFiles: ['src/index.ts'],
          priority: 100,
          matchLength: 10,
        },
        {
          label: 'low-priority',
          matchedPattern: 'test/**',
          matchedFiles: ['test/index.test.ts'],
          priority: 10,
          matchLength: 10,
        },
      ];

      const result = filterByMaxLabels(decisions, 1);

      expect(result.selected).toHaveLength(1);
      expect(result.selected[0]?.label).toBe('high-priority');
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]?.label).toBe('low-priority');
      expect(result.rejected[0]?.reason).toContain('max_labels');
    });

    test('priority同点時は最長マッチ優先', () => {
      const decisions: LabelDecision[] = [
        {
          label: 'short-pattern',
          matchedPattern: 'src/**',
          matchedFiles: ['src/index.ts'],
          priority: 10,
          matchLength: 10,
        },
        {
          label: 'long-pattern',
          matchedPattern: 'src/components/**',
          matchedFiles: ['src/components/Button.tsx'],
          priority: 10,
          matchLength: 20,
        },
      ];

      const result = filterByMaxLabels(decisions, 1);

      expect(result.selected).toHaveLength(1);
      expect(result.selected[0]?.label).toBe('long-pattern');
      expect(result.rejected).toHaveLength(1);
      expect(result.rejected[0]?.label).toBe('short-pattern');
    });

    test('max_labels=0は無制限として扱う', () => {
      const decisions: LabelDecision[] = [
        { label: 'label1', matchedPattern: 'p1', matchedFiles: ['f1'], priority: 0, matchLength: 10 },
        { label: 'label2', matchedPattern: 'p2', matchedFiles: ['f2'], priority: 0, matchLength: 10 },
        { label: 'label3', matchedPattern: 'p3', matchedFiles: ['f3'], priority: 0, matchLength: 10 },
      ];

      const result = filterByMaxLabels(decisions, 0);

      expect(result.selected).toHaveLength(3);
      expect(result.rejected).toHaveLength(0);
    });
  });
});
