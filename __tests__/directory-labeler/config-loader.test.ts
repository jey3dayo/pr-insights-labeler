import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  loadDirectoryLabelerConfig,
  validateDirectoryLabelerConfig,
} from '../../src/directory-labeler/config-loader.js';
import type { DirectoryLabelerConfig } from '../../src/directory-labeler/types.js';
import { initializeI18n, resetI18n } from '../../src/i18n.js';

describe('Directory-Based Labeler: Config Loader', () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
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

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dir-labeler-test-'));
    configPath = path.join(tempDir, 'directory-labeler.yml');
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('loadDirectoryLabelerConfig', () => {
    test('正常な設定ファイルを読み込める', () => {
      const validConfig = `
version: 1
rules:
  - label: "area:components"
    include:
      - "src/components/**"
    exclude:
      - "src/components/**/__tests__/**"
    priority: 50
`;
      fs.writeFileSync(configPath, validConfig, 'utf-8');

      const result = loadDirectoryLabelerConfig(configPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value;
        expect(config.version).toBe(1);
        expect(config.rules).toHaveLength(1);
        expect(config.rules[0]?.label).toBe('area:components');
        expect(config.rules[0]?.include).toContain('src/components/**');
        expect(config.rules[0]?.priority).toBe(50);
      }
    });

    test('設定ファイルが存在しない場合はエラーを返す', () => {
      const nonExistentPath = path.join(tempDir, 'non-existent.yml');

      const result = loadDirectoryLabelerConfig(nonExistentPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('FileSystemError');
        expect(result.error.message).toContain('File not found');
      }
    });

    test('YAMLパースエラーの場合は詳細なエラーを返す', () => {
      const invalidYaml = `
version: 1
rules:
  - label: "area:test"
    include: [
      "src/**"
    # 閉じ括弧なし
`;
      fs.writeFileSync(configPath, invalidYaml, 'utf-8');

      const result = loadDirectoryLabelerConfig(configPath);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.message).toContain('YAML');
      }
    });

    test('YAMLアンカー/エイリアスをサポートする', () => {
      const configWithAnchors = `
version: 1
rules:
  - &base_rule
    label: "area:base"
    include:
      - "src/base/**"
  - <<: *base_rule
    label: "area:extended"
    include:
      - "src/extended/**"
`;
      fs.writeFileSync(configPath, configWithAnchors, 'utf-8');

      const result = loadDirectoryLabelerConfig(configPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value;
        expect(config.rules).toHaveLength(2);
        expect(config.rules[1]?.label).toBe('area:extended');
      }
    });

    test('デフォルトオプションが適用される', () => {
      const minimalConfig = `
version: 1
rules:
  - label: "test"
    include:
      - "**/*.test.ts"
`;
      fs.writeFileSync(configPath, minimalConfig, 'utf-8');

      const result = loadDirectoryLabelerConfig(configPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value;
        expect(config.options?.dot).toBe(true);
        expect(config.options?.nocase).toBe(false);
        expect(config.options?.matchBase).toBe(false);
      }
    });

    test('デフォルト名前空間ポリシーが適用される', () => {
      const minimalConfig = `
version: 1
rules:
  - label: "test"
    include:
      - "**/*.test.ts"
`;
      fs.writeFileSync(configPath, minimalConfig, 'utf-8');

      const result = loadDirectoryLabelerConfig(configPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value;
        expect(config.namespaces?.exclusive).toContain('size');
        expect(config.namespaces?.exclusive).toContain('area');
        expect(config.namespaces?.exclusive).toContain('type');
        expect(config.namespaces?.additive).toContain('scope');
        expect(config.namespaces?.additive).toContain('meta');
      }
    });

    test('カスタムオプションを上書きできる', () => {
      const customConfig = `
version: 1
options:
  dot: false
  nocase: true
rules:
  - label: "test"
    include:
      - "**/*.test.ts"
`;
      fs.writeFileSync(configPath, customConfig, 'utf-8');

      const result = loadDirectoryLabelerConfig(configPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value;
        expect(config.options?.dot).toBe(false);
        expect(config.options?.nocase).toBe(true);
        expect(config.options?.matchBase).toBe(false);
      }
    });

    test('カスタム名前空間ポリシーを上書きできる', () => {
      const customConfig = `
version: 1
rules:
  - label: "test"
    include:
      - "**/*.test.ts"
namespaces:
  exclusive:
    - "custom-exclusive"
  additive:
    - "custom-additive"
`;
      fs.writeFileSync(configPath, customConfig, 'utf-8');

      const result = loadDirectoryLabelerConfig(configPath);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value;
        expect(config.namespaces?.exclusive).toEqual(['custom-exclusive']);
        expect(config.namespaces?.additive).toEqual(['custom-additive']);
      }
    });
  });

  describe('validateDirectoryLabelerConfig', () => {
    test('versionフィールドが必須', () => {
      const invalidConfig = {
        rules: [
          {
            label: 'test',
            include: ['**/*.ts'],
          },
        ],
      };

      const result = validateDirectoryLabelerConfig(invalidConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('version');
        expect(result.error.message).toContain('required');
      }
    });

    test('versionは1のみ許可', () => {
      const invalidConfig = {
        version: 2,
        rules: [
          {
            label: 'test',
            include: ['**/*.ts'],
          },
        ],
      };

      const result = validateDirectoryLabelerConfig(invalidConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('version');
        expect(result.error.message).toContain('must be 1');
      }
    });

    test('rulesフィールドが必須', () => {
      const invalidConfig = {
        version: 1,
      };

      const result = validateDirectoryLabelerConfig(invalidConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('rules');
        expect(result.error.message).toContain('required');
      }
    });

    test('rulesは配列でなければならない', () => {
      const invalidConfig = {
        version: 1,
        rules: 'not-an-array',
      };

      const result = validateDirectoryLabelerConfig(invalidConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('rules');
        expect(result.error.message).toContain('array');
      }
    });

    test('空のrulesは許可される（警告ログのみ）', () => {
      const validConfig = {
        version: 1,
        rules: [],
      };

      const result = validateDirectoryLabelerConfig(validConfig);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.rules).toHaveLength(0);
      }
    });

    test('ルール内のlabelフィールドが必須', () => {
      const invalidConfig = {
        version: 1,
        rules: [
          {
            include: ['**/*.ts'],
          },
        ],
      };

      const result = validateDirectoryLabelerConfig(invalidConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('rules[0].label');
        expect(result.error.message).toContain('label');
        expect(result.error.message).toContain('required');
      }
    });

    test('ルール内のincludeフィールドが必須', () => {
      const invalidConfig = {
        version: 1,
        rules: [
          {
            label: 'test',
          },
        ],
      };

      const result = validateDirectoryLabelerConfig(invalidConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('rules[0].include');
        expect(result.error.message).toContain('include');
        expect(result.error.message).toContain('required');
      }
    });

    test('includeは非空配列でなければならない', () => {
      const invalidConfig = {
        version: 1,
        rules: [
          {
            label: 'test',
            include: [],
          },
        ],
      };

      const result = validateDirectoryLabelerConfig(invalidConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('rules[0].include');
        expect(result.error.message).toContain('empty');
      }
    });

    test('同一ラベル名の重複は警告のみ（最初の定義を優先）', () => {
      const configWithDuplicates = {
        version: 1,
        rules: [
          {
            label: 'duplicate',
            include: ['src/**'],
          },
          {
            label: 'duplicate',
            include: ['test/**'],
          },
        ],
      };

      const result = validateDirectoryLabelerConfig(configWithDuplicates);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.rules).toHaveLength(2);
      }
    });

    test('priorityは数値型でなければならない', () => {
      const invalidConfig = {
        version: 1,
        rules: [
          {
            label: 'test',
            include: ['**/*.ts'],
            priority: 'high',
          },
        ],
      };

      const result = validateDirectoryLabelerConfig(invalidConfig);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('ConfigurationError');
        expect(result.error.field).toBe('rules[0].priority');
        expect(result.error.message).toContain('number');
      }
    });

    test('正常な設定はバリデーションを通過する', () => {
      const validConfig: DirectoryLabelerConfig = {
        version: 1,
        options: {
          dot: true,
          nocase: false,
        },
        rules: [
          {
            label: 'area:components',
            include: ['src/components/**'],
            exclude: ['src/components/**/__tests__/**'],
            priority: 50,
          },
          {
            label: 'area:utils',
            include: ['src/utils/**'],
          },
        ],
        namespaces: {
          exclusive: ['area'],
          additive: ['meta'],
        },
      };

      const result = validateDirectoryLabelerConfig(validConfig);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual(validConfig);
      }
    });
  });
});
