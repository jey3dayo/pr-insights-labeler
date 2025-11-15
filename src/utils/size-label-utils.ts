import type { SizeThresholds } from '../parsers/action-input-parsers.js';

/**
 * Size Label Utilities
 *
 * Common utilities for calculating size category labels based on additions and thresholds
 */

/**
 * Calculate size category label based on total additions and thresholds
 *
 * @param additions - Total number of additions in PR
 * @param thresholds - Size thresholds configuration
 * @returns Size category label (size/small, size/medium, size/large, size/xlarge, or size/xxlarge)
 *
 * @example
 * ```typescript
 * calculateSizeLabel(150, { small: 200, medium: 500, large: 1000, xlarge: 3000 })
 * // Returns: "size/small"
 *
 * calculateSizeLabel(600, { small: 200, medium: 500, large: 1000, xlarge: 3000 })
 * // Returns: "size/large"
 * ```
 */
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
