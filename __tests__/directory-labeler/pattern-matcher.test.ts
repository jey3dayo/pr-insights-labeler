/**
 * Directory-Based Labeler: Pattern Matcherのユニットテスト
 */

import { describe, expect, test } from 'vitest';

import {
  type CompiledPattern,
  compilePatterns,
  matchIncludePatterns,
} from '../../src/directory-labeler/pattern-matcher.js';
import { DEFAULT_EXCLUDES } from '../../src/directory-labeler/types.js';
import { normalizePath } from '../../src/utils/path-utils.js';

describe('Directory-Based Labeler: Pattern Matcher', () => {
  describe('normalizePath', () => {
    test('Windowsパス（backslash）をPOSIXスタイル（slash）に正規化', () => {
      const windowsPath = 'src\\components\\Button.tsx';
      const normalized = normalizePath(windowsPath);
      expect(normalized).toBe('src/components/Button.tsx');
    });

    test('POSIXパスはそのまま', () => {
      const posixPath = 'src/components/Button.tsx';
      const normalized = normalizePath(posixPath);
      expect(normalized).toBe('src/components/Button.tsx');
    });

    test('先頭の "./" を削除', () => {
      const path = './src/components/Button.tsx';
      const normalized = normalizePath(path);
      expect(normalized).toBe('src/components/Button.tsx');
    });

    test('混在したパス区切り文字を正規化', () => {
      const mixedPath = 'src/components\\utils/helper.ts';
      const normalized = normalizePath(mixedPath);
      expect(normalized).toBe('src/components/utils/helper.ts');
    });

    test('Windowsドライブレター付きパス', () => {
      const drivePath = 'C:\\Users\\test\\project\\src\\index.ts';
      const normalized = normalizePath(drivePath);
      expect(normalized).toBe('C:/Users/test/project/src/index.ts');
    });

    test('UNCパス（Windows ネットワークパス）', () => {
      const uncPath = '\\\\server\\share\\project\\src\\index.ts';
      const normalized = normalizePath(uncPath);
      expect(normalized).toBe('//server/share/project/src/index.ts');
    });
  });

  describe('compilePatterns', () => {
    test('パターンをコンパイルして再利用可能なマッチャーを生成', () => {
      const patterns = ['src/**/*.ts', 'test/**/*.test.ts'];
      const compiled = compilePatterns(patterns, { dot: true });

      expect(compiled).toHaveLength(2);
      expect(compiled[0]?.pattern).toBe('src/**/*.ts');
      expect(compiled[1]?.pattern).toBe('test/**/*.test.ts');
    });

    test('空の配列を渡すと空の配列を返す', () => {
      const compiled = compilePatterns([], { dot: true });
      expect(compiled).toHaveLength(0);
    });

    test('コンパイル済みマッチャーでファイルパスをマッチング', () => {
      const patterns = ['src/**/*.ts'];
      const compiled = compilePatterns(patterns, { dot: true });

      expect(compiled[0]?.matcher('src/index.ts')).toBe(true);
      expect(compiled[0]?.matcher('test/index.test.ts')).toBe(false);
    });

    test('dotオプションで隠しファイルをマッチング', () => {
      // dotオプションは、ワイルドカード（*や**）がドットで始まるセグメントにマッチするかを制御
      // dot:trueの場合、`**/*`は`.hidden`にマッチ
      // dot:falseの場合、`**/*`は`.hidden`にマッチしない
      const patternsWildcard = ['src/**/*'];
      const compiledWithDot = compilePatterns(patternsWildcard, { dot: true, nocase: false, matchBase: false });
      const compiledWithoutDot = compilePatterns(patternsWildcard, { dot: false, nocase: false, matchBase: false });

      expect(compiledWithDot[0]?.matcher('src/.hidden/file.ts')).toBe(true);
      expect(compiledWithoutDot[0]?.matcher('src/.hidden/file.ts')).toBe(false);

      // パターンが明示的にドットを含む場合（`**/.hidden`）は、dotオプションに関わらずマッチ
      const patternsExplicitDot = ['**/.github/**'];
      const compiledExplicitDot = compilePatterns(patternsExplicitDot, { dot: false, nocase: false, matchBase: false });
      expect(compiledExplicitDot[0]?.matcher('project/.github/workflows/ci.yml')).toBe(true);
    });

    test('nocaseオプションで大文字小文字を区別しない', () => {
      const patterns = ['src/**/*.TS'];
      const compiledCaseSensitive = compilePatterns(patterns, { nocase: false });
      const compiledCaseInsensitive = compilePatterns(patterns, { nocase: true });

      expect(compiledCaseSensitive[0]?.matcher('src/index.ts')).toBe(false);
      expect(compiledCaseInsensitive[0]?.matcher('src/index.ts')).toBe(true);
    });
  });

  describe('matchIncludePatterns', () => {
    test('単一パターンマッチ', () => {
      const patterns = compilePatterns(['src/components/**'], { dot: true });
      const excludePatterns = compilePatterns([], { dot: true });

      const result = matchIncludePatterns('src/components/Button.tsx', patterns, excludePatterns);

      expect(result.matched).toBe(true);
      expect(result.matchedPattern).toBe('src/components/**');
      expect(result.matchLength).toBeGreaterThan(0);
    });

    test('複数パターンマッチ（最長マッチ優先）', () => {
      const patterns = compilePatterns(['src/**', 'src/components/**'], { dot: true });
      const excludePatterns = compilePatterns([], { dot: true });

      const result = matchIncludePatterns('src/components/Button.tsx', patterns, excludePatterns);

      expect(result.matched).toBe(true);
      expect(result.matchedPattern).toBe('src/components/**'); // より具体的なパターン
    });

    test('除外パターン優先評価', () => {
      const patterns = compilePatterns(['src/components/**'], { dot: true });
      const excludePatterns = compilePatterns(['src/components/**/__tests__/**'], { dot: true });

      const result = matchIncludePatterns('src/components/__tests__/Button.test.tsx', patterns, excludePatterns);

      expect(result.matched).toBe(false);
    });

    test('パターンマッチしない', () => {
      const patterns = compilePatterns(['src/components/**'], { dot: true });
      const excludePatterns = compilePatterns([], { dot: true });

      const result = matchIncludePatterns('src/utils/helper.ts', patterns, excludePatterns);

      expect(result.matched).toBe(false);
      expect(result.matchedPattern).toBeUndefined();
    });

    test('最長マッチ長の計算', () => {
      const patterns = compilePatterns(['src/**/*.ts', 'src/components/**/*.tsx'], { dot: true });
      const excludePatterns = compilePatterns([], { dot: true });

      const result = matchIncludePatterns('src/components/Button.tsx', patterns, excludePatterns);

      expect(result.matched).toBe(true);
      // 'src/components/**/*.tsx' の方が具体的なため、こちらがマッチ
      expect(result.matchedPattern).toBe('src/components/**/*.tsx');
    });

    test('デフォルト除外パターンの適用', () => {
      const patterns = compilePatterns(['**/*'], { dot: true });
      const excludePatterns = compilePatterns(DEFAULT_EXCLUDES as unknown as string[], { dot: true });

      // node_modulesは除外される
      const nodeModulesResult = matchIncludePatterns('node_modules/package/index.js', patterns, excludePatterns);
      expect(nodeModulesResult.matched).toBe(false);

      // .gitディレクトリは除外される
      const gitResult = matchIncludePatterns('.git/config', patterns, excludePatterns);
      expect(gitResult.matched).toBe(false);

      // ロックファイルは除外される
      const lockFileResult = matchIncludePatterns('package-lock.json', patterns, excludePatterns);
      expect(lockFileResult.matched).toBe(false);

      // 通常のソースファイルはマッチ
      const sourceFileResult = matchIncludePatterns('src/index.ts', patterns, excludePatterns);
      expect(sourceFileResult.matched).toBe(true);
    });

    test('デフォルト除外パターン: ロックファイルと生成物', () => {
      const patterns = compilePatterns(['**/*'], { dot: true });
      const excludePatterns = compilePatterns(DEFAULT_EXCLUDES as unknown as string[], { dot: true });
      const excluded = (path: string) => !matchIncludePatterns(path, patterns, excludePatterns).matched;

      // Gradle の依存ロック（buildscript / per-configuration を含む）
      expect(excluded('gradle.lockfile')).toBe(true);
      expect(excluded('buildscript-gradle.lockfile')).toBe(true);
      expect(excluded('gradle/dependency-locks/compileClasspath.lockfile')).toBe(true);

      // 末尾が .lock / .lockfile ではないロックファイル
      expect(excluded('pylock.toml')).toBe(true);
      expect(excluded('pylock.dev.toml')).toBe(true);
      expect(excluded('gems.locked')).toBe(true);
      expect(excluded('conda-lock.yml')).toBe(true);
      expect(excluded('cabal.project.freeze')).toBe(true);
      expect(excluded('maven_install.json')).toBe(true);

      // Yarn Berry が設計上コミットする生成物
      expect(excluded('.pnp.cjs')).toBe(true);
      expect(excluded('.pnp.loader.mjs')).toBe(true);
      expect(excluded('.yarn/cache/lodash-npm-4.17.21.zip')).toBe(true);
      expect(excluded('.yarn/releases/yarn-4.0.0.cjs')).toBe(true);
      expect(excluded('packages/app/.yarn/cache/x.zip')).toBe(true);

      // 手書きで解析対象に残すファイル
      expect(excluded('requirements.txt')).toBe(false);
      expect(excluded('gradle/libs.versions.toml')).toBe(false);
      expect(excluded('pnpm-workspace.yaml')).toBe(false);
      expect(excluded('go.mod')).toBe(false);
      expect(excluded('.yarn/patches/lodash.patch')).toBe(false);
      expect(excluded('.yarnrc.yml')).toBe(false);

      // PEP 751 の命名規則（`pylock.<非ドット1要素>.toml`）を超えるものは除外しない
      expect(excluded('pylock.dev.backup.toml')).toBe(false);
    });

    test('リネームファイル: 新パスで判定', () => {
      // リネームの場合、呼び出し側で新パスを渡すことを想定
      const patterns = compilePatterns(['src/new/**'], { dot: true });
      const excludePatterns = compilePatterns([], { dot: true });

      const newPath = 'src/new/A.ts'; // 移動先パス
      const result = matchIncludePatterns(newPath, patterns, excludePatterns);

      expect(result.matched).toBe(true);
      expect(result.matchedPattern).toBe('src/new/**');
    });
  });

  describe('優先順位決定アルゴリズム', () => {
    test('priority明示時: 高い優先度が選ばれる', () => {
      const patterns: CompiledPattern[] = [
        {
          pattern: 'src/components/**',
          matcher: (path: string) => path.startsWith('src/components/'),
          priority: 10,
        },
        {
          pattern: 'src/components/core/**',
          matcher: (path: string) => path.startsWith('src/components/core/'),
          priority: 50,
        },
      ];

      const excludePatterns = compilePatterns([], { dot: true });
      const result = matchIncludePatterns('src/components/core/Button.tsx', patterns, excludePatterns);

      expect(result.matched).toBe(true);
      expect(result.matchedPattern).toBe('src/components/core/**');
    });

    test('priority同点時: 最長マッチ長が選ばれる', () => {
      const patterns: CompiledPattern[] = [
        {
          pattern: 'src/**',
          matcher: (path: string) => path.startsWith('src/'),
          priority: 10,
        },
        {
          pattern: 'src/components/**',
          matcher: (path: string) => path.startsWith('src/components/'),
          priority: 10, // 同じpriority
        },
      ];

      const excludePatterns = compilePatterns([], { dot: true });
      const result = matchIncludePatterns('src/components/Button.tsx', patterns, excludePatterns);

      expect(result.matched).toBe(true);
      // より具体的な 'src/components/**' が選ばれる
      expect(result.matchedPattern).toBe('src/components/**');
    });

    test('priority未指定時: 最長マッチで決定', () => {
      const patterns: CompiledPattern[] = [
        {
          pattern: 'src/**',
          matcher: (path: string) => path.startsWith('src/'),
        },
        {
          pattern: 'src/components/**',
          matcher: (path: string) => path.startsWith('src/components/'),
        },
      ];

      const excludePatterns = compilePatterns([], { dot: true });
      const result = matchIncludePatterns('src/components/Button.tsx', patterns, excludePatterns);

      expect(result.matched).toBe(true);
      expect(result.matchedPattern).toBe('src/components/**');
    });
  });

  describe('OS差異テスト', () => {
    test('Windows環境: backslashパスを正しく処理', () => {
      const windowsPath = 'src\\components\\Button.tsx';
      const normalized = normalizePath(windowsPath);

      const patterns = compilePatterns(['src/components/**'], { dot: true });
      const excludePatterns = compilePatterns([], { dot: true });
      const result = matchIncludePatterns(normalized, patterns, excludePatterns);

      expect(result.matched).toBe(true);
    });

    test('Mac/Linux環境: POSIXパスをそのまま処理', () => {
      const posixPath = 'src/components/Button.tsx';

      const patterns = compilePatterns(['src/components/**'], { dot: true });
      const excludePatterns = compilePatterns([], { dot: true });
      const result = matchIncludePatterns(posixPath, patterns, excludePatterns);

      expect(result.matched).toBe(true);
    });
  });
});
