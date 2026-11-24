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

export { DEFAULT_ANALYSIS_OPTIONS };
export type { AnalysisOptions };

function mergeAnalysisOptions(options?: Partial<AnalysisOptions>): Required<AnalysisOptions> {
  return { ...DEFAULT_ANALYSIS_OPTIONS, ...options };
}

function hasTsconfigJson(): boolean {
  try {
    const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
    return existsSync(tsconfigPath);
  } catch {
    return false;
  }
}

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
        complexity: ['error', 0],
      },
    },
  });
}

function parseComplexityMessage(message: Linter.LintMessage): FunctionComplexity | null {
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

function hasSyntaxError(messages: Linter.LintMessage[]): boolean {
  return messages.some(m => m.fatal === true || m.message.toLowerCase().includes('parsing error'));
}

function analyzeFile(
  filePath: string,
  options?: Partial<AnalysisOptions>,
  eslintContext?: { eslint: ESLint; hasTsconfig: boolean },
): ResultAsync<FileComplexity, ComplexityAnalysisError> {
  const opts = mergeAnalysisOptions(options);

  return ResultAsync.fromPromise(
    (async () => {
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
          throw error;
        }
        throw createComplexityAnalysisError('analysis_failed', {
          filename: filePath,
          details: `Failed to stat file ${filePath}: ${ensureError(error).message}`,
        });
      }

      let eslint: ESLint;
      if (eslintContext) {
        ({ eslint } = eslintContext);
      } else {
        const hasTsconfig = hasTsconfigJson();
        if (!hasTsconfig) {
          core.warning('tsconfig.json not found. Using default parser options for complexity analysis.');
        }
        eslint = createESLintInstance(hasTsconfig);
      }

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

      const functions = result.messages
        .filter(m => m.ruleId === 'complexity')
        .map(parseComplexityMessage)
        .filter((f): f is FunctionComplexity => f !== null);

      const totalComplexity = functions.reduce((sum, f) => sum + f.complexity, 0);

      return {
        path: filePath,
        complexity: totalComplexity,
        functions,
        isSyntaxError: false,
      };
    })(),
    (error): ComplexityAnalysisError => {
      if (isComplexityAnalysisError(error)) {
        return error;
      }

      return createComplexityAnalysisError('analysis_failed', {
        filename: filePath,
        details: `Failed to analyze ${filePath}: ${ensureError(error).message}`,
      });
    },
  );
}

function analyzeFiles(
  filePaths: string[],
  options?: Partial<AnalysisOptions>,
): ResultAsync<ComplexityMetrics, ComplexityAnalysisError> {
  const opts = mergeAnalysisOptions(options);
  const startTime = Date.now();

  return ResultAsync.fromPromise(
    (async () => {
      const successful: FileComplexity[] = [];
      const skippedFiles: SkippedFile[] = [];

      const raw = Number.isFinite(opts.concurrency as number) ? (opts.concurrency as number) : 8;
      const concurrency = Math.max(1, Math.min(raw, 8));
      const limit = pLimit(concurrency);

      core.info(`Analyzing ${filePaths.length} files with concurrency ${concurrency}`);

      const hasTsconfig = hasTsconfigJson();
      if (!hasTsconfig) {
        core.warning('tsconfig.json not found. Using default parser options for complexity analysis.');
      }
      const eslint = createESLintInstance(hasTsconfig);

      const promises = filePaths.map(filePath =>
        limit(async () => {
          const result = await analyzeFile(filePath, opts, { eslint, hasTsconfig });

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

      const elapsedTime = Date.now() - startTime;
      core.info(`Complexity analysis completed: ${successful.length} files, ${elapsedTime}ms`);

      if (elapsedTime > 10000) {
        core.warning(`Complexity analysis took ${elapsedTime}ms (target: <5000ms for 100 files)`);
      }

      const baseMetrics = aggregateMetrics(successful);

      if (!baseMetrics) {
        throw createComplexityAnalysisError('general', {
          details: `No files could be analyzed. Analyzed: ${successful.length}, Skipped: ${skippedFiles.length}`,
        });
      }

      const completeMetrics: ComplexityMetrics = {
        ...baseMetrics,
        skippedFiles,
        truncated: false,
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

export function aggregateMetrics(
  results: FileComplexity[],
): Omit<ComplexityMetrics, 'skippedFiles' | 'truncated' | 'totalPRFiles' | 'hasTsconfig'> | undefined {
  if (results.length === 0) {
    return undefined;
  }

  const syntaxErrorFiles = results.filter(r => r.isSyntaxError === true).map(r => r.path);

  const validFiles = results.filter(r => r.complexity >= 0);

  if (validFiles.length === 0) {
    return undefined;
  }

  const maxComplexity = Math.max(...validFiles.map(f => f.complexity));

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

export function createComplexityAnalyzer(): ComplexityAnalyzer {
  return {
    analyzeFile: (filePath, options) => analyzeFile(filePath, options),
    analyzeFiles: (filePaths, options) => analyzeFiles(filePaths, options),
  };
}
