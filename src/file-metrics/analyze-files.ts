import { ok, Result } from 'neverthrow';

import { logDebug, logInfo, logWarning } from '../actions-io.js';
import type { DiffFile } from '../diff-strategy';
import type { FileAnalysisError, ViolationDetail } from '../errors/index.js';
import { ensureError } from '../errors/index.js';
import { getDefaultExcludePatterns, isExcluded } from '../pattern-matcher';
import type { AnalysisResult, FileMetrics } from '../types/analysis.js';
import { isBinaryFile } from './binary-detector.js';
import { getFileSize } from './file-size-service.js';
import { getFileLineCount } from './line-counter.js';
import type { AnalysisConfig, RepoContext } from './types.js';

interface InternalState {
  result: AnalysisResult;
  excludePatterns: string[];
}

function createInitialState(files: DiffFile[], config: AnalysisConfig): InternalState {
  return {
    result: {
      metrics: {
        totalFiles: files.length,
        totalAdditions: 0,
        excludedAdditions: 0,
        filesAnalyzed: [],
        filesExcluded: [],
        filesSkippedBinary: [],
        filesWithErrors: [],
        allFiles: files.map(f => f.filename),
      },
      violations: {
        largeFiles: [],
        exceedsFileLines: [],
        exceedsAdditions: false,
        exceedsFileCount: false,
      },
    },
    excludePatterns: [...getDefaultExcludePatterns(), ...config.excludePatterns],
  };
}

function recordViolation(list: ViolationDetail[], violation: ViolationDetail, message: string): void {
  list.push(violation);
  logWarning(message);
}

async function collectFileMetrics(
  file: DiffFile,
  config: AnalysisConfig,
  token: string,
  context: RepoContext,
): Promise<FileMetrics | undefined> {
  const sizeResult = await getFileSize(file.filename, token, context);
  const lineResult = await getFileLineCount(file.filename, config.fileLineLimit + 1);

  if (sizeResult.isErr() || lineResult.isErr()) {
    return undefined;
  }

  return {
    path: file.filename,
    size: sizeResult.value,
    lines: lineResult.value,
    additions: file.additions,
    deletions: file.deletions,
  };
}

async function processFile(
  state: InternalState,
  file: DiffFile,
  config: AnalysisConfig,
  token: string,
  context: RepoContext,
): Promise<void> {
  const { result, excludePatterns } = state;

  if (isExcluded(file.filename, excludePatterns)) {
    result.metrics.filesExcluded.push(file.filename);
    result.metrics.excludedAdditions += file.additions;
    return;
  }

  if (await isBinaryFile(file.filename)) {
    result.metrics.filesSkippedBinary.push(file.filename);
    logDebug(`Skipping binary file: ${file.filename}`);
    return;
  }

  const metrics = await collectFileMetrics(file, config, token, context);

  if (!metrics) {
    result.metrics.filesWithErrors.push(file.filename);
    result.metrics.excludedAdditions += file.additions;
    logWarning(`Failed to analyze file ${file.filename}`);
    return;
  }

  result.metrics.filesAnalyzed.push(metrics);
  result.metrics.totalAdditions += file.additions;

  if (metrics.size > config.fileSizeLimit) {
    recordViolation(
      result.violations.largeFiles,
      {
        file: file.filename,
        actualValue: metrics.size,
        limit: config.fileSizeLimit,
        violationType: 'size',
        severity: 'critical',
      },
      `File ${file.filename} exceeds size limit: ${metrics.size} > ${config.fileSizeLimit}`,
    );
  }

  if (metrics.lines > config.fileLineLimit) {
    recordViolation(
      result.violations.exceedsFileLines,
      {
        file: file.filename,
        actualValue: metrics.lines,
        limit: config.fileLineLimit,
        violationType: 'lines',
        severity: 'warning',
      },
      `File ${file.filename} exceeds line limit: ${metrics.lines} > ${config.fileLineLimit}`,
    );
  }
}

export async function analyzeFiles(
  files: DiffFile[],
  config: AnalysisConfig,
  token: string,
  context: RepoContext,
): Promise<Result<AnalysisResult, FileAnalysisError>> {
  logInfo(`Analyzing ${files.length} files`);

  const state = createInitialState(files, config);

  if (files.length > config.maxFileCount) {
    state.result.violations.exceedsFileCount = true;
    logWarning(`File count ${files.length} exceeds limit ${config.maxFileCount}`);
  }

  for (let i = 0; i < files.length; i++) {
    if (i >= config.maxFileCount) {
      logWarning(`Reached max file count limit (${config.maxFileCount}), skipping remaining files`);
      break;
    }

    const file = files[i];
    if (!file) {
      continue;
    }

    try {
      await processFile(state, file, config, token, context);
    } catch (error) {
      state.result.metrics.filesWithErrors.push(file.filename);
      state.result.metrics.excludedAdditions += file.additions;
      logWarning(`Unexpected error analyzing file ${file.filename}: ${ensureError(error).message}`);
    }
  }

  if (state.result.metrics.totalAdditions > config.maxAddedLines) {
    state.result.violations.exceedsAdditions = true;
    logWarning(`Total additions ${state.result.metrics.totalAdditions} exceeds limit ${config.maxAddedLines}`);
  }

  logInfo(
    `Analysis complete: ${state.result.metrics.filesAnalyzed.length} files analyzed, ${state.result.metrics.filesExcluded.length} excluded, ${state.result.metrics.filesSkippedBinary.length} binary files skipped`,
  );

  return ok(state.result);
}
