import type { SizeThresholds } from '../parsers/action-input-parsers.js';

export function calculateSizeLabel(additions: number, thresholds: SizeThresholds): string {
  if (additions < thresholds.small) {
    return 'size/small';
  }
  if (additions < thresholds.medium) {
    return 'size/medium';
  }
  if (additions < thresholds.large) {
    return 'size/large';
  }
  if (additions < thresholds.xlarge) {
    return 'size/xlarge';
  }
  return 'size/xxlarge';
}
