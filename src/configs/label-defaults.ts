export const AUTO_LABEL_PREFIX = 'auto/';

export const VIOLATION_LABELS = {
  largeFiles: 'auto/large-files',
  tooManyLines: 'auto/too-many-lines',
  excessiveChanges: 'auto/excessive-changes',
  tooManyFiles: 'auto/too-many-files',
} as const;

export const COMPLEXITY_LABELS = {
  medium: 'complexity/medium',
  high: 'complexity/high',
} as const;

export const RISK_LABELS = {
  high: 'risk/high',
  medium: 'risk/medium',
} as const;
