import type { SizeThresholds } from './parsers/action-input-parsers.js';
import { calculateSizeLabel } from './utils/size-label-utils.js';

export const SIZE_ORDER = ['small', 'medium', 'large', 'xlarge', 'xxlarge'] as const;

export type SizeValue = (typeof SIZE_ORDER)[number];

function isSizeValue(value: string): value is SizeValue {
  for (const size of SIZE_ORDER) {
    if (size === value) {
      return true;
    }
  }
  return false;
}

export function compareSizeThreshold(appliedSize: string, threshold: string): boolean {
  const sizeValue = appliedSize.startsWith('size/') ? appliedSize.replace('size/', '') : appliedSize;

  if (!isSizeValue(sizeValue) || !isSizeValue(threshold)) {
    return false;
  }

  const appliedIndex = SIZE_ORDER.indexOf(sizeValue);
  const thresholdIndex = SIZE_ORDER.indexOf(threshold);

  return appliedIndex >= thresholdIndex;
}

export function calculateSizeCategory(totalAdditions: number, thresholds: SizeThresholds): string {
  return calculateSizeLabel(totalAdditions, thresholds);
}
