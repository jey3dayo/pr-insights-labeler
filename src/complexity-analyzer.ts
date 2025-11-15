/**
 * Complexity Analyzer for PR files
 * Uses ESLint standard complexity rule
 */

import { existsSync, promises as fs } from 'node:fs';
import * as path from 'node:path';

import * as core from '@actions/core';
import parser from '@typescript-eslint/parser';
import type { Linter } from 'eslint';
import { ESLint } from 'eslint';
import { ResultAsync } from 'neverthrow';
import pLimit from 'p-limit';

import { DEFAULT_ANALYSIS_OPTIONS } from './configs/default-config.js';
import {
  type ComplexityAnalysisError,
  createComplexityAnalysisError,
  ensureError,
  isComplexityAnalysisError,
} from './errors/index.js';
import type { ComplexityMetrics, FileComplexity, FunctionComplexity, SkippedFile } from './labeler-types.js';
import type { AnalysisOptions } from './types/config.js';

// Re-export for backward compatibility
export { DEFAULT_ANALYSIS_OPTIONS };
export type { AnalysisOptions };

/**
 * Check if tsconfig.json exists in the project root
 * @returns True if tsconfig.json exists
 */
function hasTsconfigJson(): boolean {
  try {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    return existsSync(tsconfigPath);
  } catch {
    return false;
  }
}

/**
 * Create ESLint instance with complexity rule enabled
 * @param hasTsconfig - Whether tsconfig.json exists
 * @returns Configured ESLint instance
 */
function createESLintInstance(hasTsconfig: boolean): ESLint {
  return new ESLint({
    overrideConfigFile: true,
    baseConfig: {
      files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
      languageOptions: {
        parser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ...(hasTsconfig && { tsconfigRootDir: process.cwd() }),
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      rules: {
        complexity: ['error', 0], // Report all functions (threshold 0)
      },
    },
  });
}

/**
 * Parse complexity from ESLint message
 * Message format: "Function 'functionName' has a complexity of 5. Maximum allowed is 0."
 *
 * @param message - ESLint message object
 * @returns Parsed function complexity or null
 */
function parseComplexityMessage(message: Linter.LintMessage): FunctionComplexity | null {
  // Pattern: "Function 'name' has a complexity of N." or "Function \"name\" has a complexity of N."
  // Tightened to handle quoted names with punctuation robustly
  const pattern = /Function ["']([^"']+)["'] has a complexity of (\d+)\b/i;
  const match = message.message.match(pattern);

  if (!match || !match[1] || !match[2]) {
    core.debug(`Failed to parse complexity message: ${message.message}`);
    return null;
  }

  const complexityValue = Number.parseInt(match[2], 10);
  if (Number.isNaN(complexityValue)) {
    core.debug(`Invalid complexity value: ${match[2]}`);
    return null;
  }

  return {
    name: match[1],
    complexity: complexityValue,
    loc: {
      start: message.line || 1,
      end: message.endLine || message.line || 1,
    },
  };
}

/**
 * Check if error is a syntax error
 * @param messages - ESLint messages
 * @returns True if syntax error found
 */
function hasSyntaxError(messages: Linter.LintMessage[]): boolean {
  return messages.some(m => m.fatal === true || m.message.toLowerCase().includes('parsing error'));
}

/**
 * Analyze a single file for complexity
 * @param filePath - Repository-relative file path
 * @param options - Analysis options
 * @returns File complexity or error
 */
function analyzeFile(
  filePath: string,
  options?: Partial<AnalysisOptions>,
): ResultAsync<FileComplexity, ComplexityAnalysisError> {
  const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };

  return ResultAsync.fromPromise(
    (async () => {
      // 1. Check file size (before reading content)
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > opts.maxFileSize) {
          throw createComplexityAnalysisError('too_large', {
            filename: filePath,
            fileSize: stats.size,
            maxSize: opts.maxFileSize,
            details: `File ${filePath} exceeds max size (${stats.size} > ${opts.maxFileSize})`,
          });
        }
      } catch (error) {
        if (isComplexityAnalysisError(error)) {
          // Re-throw ComplexityAnalysisError
          throw error;
        }
        throw createComplexityAnalysisError('analysis_failed', {
          filename: filePath,
          details: `Failed to stat file ${filePath}: ${ensureError(error).message}`,
        });
      }

      // 2. Run ESLint complexity rule
      const hasTsconfig = hasTsconfigJson();
      if (!hasTsconfig) {
        core.warning('tsconfig.json not found. Using default parser options for complexity analysis.');
      }

      const eslint = createESLintInstance(hasTsconfig);

      const results = await eslint.lintFiles([filePath]);

      if (!results || results.length === 0) {
        throw createComplexityAnalysisError('analysis_failed', {
          filename: filePath,
          details: `No ESLint results for ${filePath}`,
        });
      }

      const result = results[0];
      if (!result) {
        throw createComplexityAnalysisError('analysis_failed', {
          filename: filePath,
          details: `Empty ESLint result for ${filePath}`,
        });
      }

      // Check for syntax errors
      const syntaxError = hasSyntaxError(result.messages);
      if (syntaxError) {
        core.debug(`Syntax error in ${filePath}, treating as complexity 0`);
        return {
          path: filePath,
          complexity: 0,
          functions: [],
          isSyntaxError: true,
        };
      }

      // Parse complexity from messages
      const functions = result.messages
        .filter(m => m.ruleId === 'complexity')
        .map(parseComplexityMessage)
        .filter((f): f is FunctionComplexity => f !== null);

      // Calculate total file complexity (sum of all functions)
      const totalComplexity = functions.reduce((sum, f) => sum + f.complexity, 0);

      return {
        path: filePath,
        complexity: totalComplexity,
        functions,
        isSyntaxError: false,
      };
    })(),
    (error): ComplexityAnalysisError => {
      // Error is already a ComplexityAnalysisError
      if (isComplexityAnalysisError(error)) {
        return error;
      }

      // Convert unknown errors
      return createComplexityAnalysisError('analysis_failed', {
        filename: filePath,
        details: `Failed to analyze ${filePath}: ${ensureError(error).message}`,
      });
    },
  );
}

/**
 * Analyze multiple files in parallel and aggregate metrics
 * @param filePaths - List of file paths to analyze
 * @param options - Analysis options
 * @returns PR-wide complexity metrics or error
 */
function analyzeFiles(
  filePaths: string[],
  options?: Partial<AnalysisOptions>,
): ResultAsync<ComplexityMetrics, ComplexityAnalysisError> {
  const opts = { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
  const startTime = Date.now();

  return ResultAsync.fromPromise(
    (async () => {
      const successful: FileComplexity[] = [];
      const skippedFiles: SkippedFile[] = [];

      // p-limitで並列度制御
      const raw = Number.isFinite(opts.concurrency as number) ? (opts.concurrency as number) : 8;
      const concurrency = Math.max(1, Math.min(raw, 8));
      const limit = pLimit(concurrency);

      core.info(`Analyzing ${filePaths.length} files with concurrency ${concurrency}`);

      // 各ファイルの解析を並列実行
      const promises = filePaths.map(filePath =>
        limit(async () => {
          const result = await analyzeFile(filePath, opts);

          if (result.isOk()) {
            return { status: 'fulfilled' as const, value: result.value };
          } else {
            return {
              status: 'rejected' as const,
              reason: result.error,
            };
          }
        }),
      );

      const results = await Promise.all(promises);

      // 成功/失敗を分類
      for (const result of results) {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          const error = result.reason;
          const skipped: SkippedFile = {
            path: error.filename || 'unknown',
            reason: error.reason,
          };
          if (error.details) {
            skipped.details = error.details;
          }
          skippedFiles.push(skipped);
        }
      }

      // 実行時間測定
      const elapsedTime = Date.now() - startTime;
      core.info(`Complexity analysis completed: ${successful.length} files, ${elapsedTime}ms`);

      if (elapsedTime > 10000) {
        core.warning(`Complexity analysis took ${elapsedTime}ms (target: <5000ms for 100 files)`);
      }

      // 集計
      const baseMetrics = aggregateMetrics(successful);

      if (!baseMetrics) {
        throw createComplexityAnalysisError('general', {
          details: `No files could be analyzed. Analyzed: ${successful.length}, Skipped: ${skippedFiles.length}`,
        });
      }

      // 完全なComplexityMetricsを構築
      const hasTsconfig = hasTsconfigJson();
      const completeMetrics: ComplexityMetrics = {
        ...baseMetrics,
        skippedFiles,
        truncated: false, // 呼び出し元で設定
        hasTsconfig,
      };

      return completeMetrics;
    })(),
    (error): ComplexityAnalysisError => {
      if (isComplexityAnalysisError(error)) {
        return error;
      }
      return createComplexityAnalysisError('general', {
        details: `Failed to analyze files: ${ensureError(error).message}`,
      });
    },
  );
}

export type ComplexityAnalyzer = {
  analyzeFile: typeof analyzeFile;
  analyzeFiles: typeof analyzeFiles;
};

/**
 * Aggregate complexity metrics from file results
 * @param results - Array of file complexity results
 * @returns Aggregated metrics or undefined if no files
 */
export function aggregateMetrics(
  results: FileComplexity[],
): Omit<ComplexityMetrics, 'skippedFiles' | 'truncated' | 'totalPRFiles' | 'hasTsconfig'> | undefined {
  // 0件の場合は早期リターン（Math.max([])で-Infinity、0除算を回避）
  if (results.length === 0) {
    return undefined;
  }

  // 構文エラーファイル（複雑度0、isSyntaxError: true）を抽出
  const syntaxErrorFiles = results.filter(r => r.isSyntaxError === true).map(r => r.path);

  // 全ファイル（構文エラー含む）を集計対象とする（要件6.3準拠）
  const validFiles = results.filter(r => r.complexity >= 0);

  // validFilesが0件の場合もundefined（全ファイルがスキップされた場合）
  if (validFiles.length === 0) {
    return undefined;
  }

  // 最大複雑度: 全ファイルから最大値を取得
  const maxComplexity = Math.max(...validFiles.map(f => f.complexity));

  // 平均複雑度: 構文エラーファイル（複雑度0）も含めて計算（要件6.3準拠）
  // 小数第1位で四捨五入
  const avgComplexity =
    Math.round((validFiles.reduce((sum, f) => sum + f.complexity, 0) / validFiles.length) * 10) / 10;

  return {
    maxComplexity,
    avgComplexity,
    analyzedFiles: validFiles.length,
    files: validFiles,
    syntaxErrorFiles,
  };
}

/**
 * Create a new ComplexityAnalyzer instance
 */
export function createComplexityAnalyzer(): ComplexityAnalyzer {
  return {
    analyzeFile: (filePath, options) => analyzeFile(filePath, options),
    analyzeFiles: (filePaths, options) => analyzeFiles(filePaths, options),
  };
}
