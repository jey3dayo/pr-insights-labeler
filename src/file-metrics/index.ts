export type { AnalysisConfig, RepoContext } from './types.js';
export type { AnalysisResult, FileMetrics, Metrics } from './types.js';

export { analyzeFiles } from './analyze-files.js';
export { getFileSize } from './file-size-service.js';
export { getFileLineCount } from './line-counter.js';
export { isBinaryFile } from './binary-detector.js';
