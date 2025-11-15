/**
 * Size comparison utilities for PR size threshold evaluation
 */

import type { SizeThresholdsV2 } from './parsers/action-input-parsers.js';
import { calculateSizeLabel } from './utils/size-label-utils.js';

/**
 * Size order definition (small < medium < large < xlarge < xxlarge)
 */
export const SIZE_ORDER = ['small', 'medium', 'large', 'xlarge', 'xxlarge'] as const;

/**
 * Size value type
 */
export type SizeValue = (typeof SIZE_ORDER)[number];

/**
 * Type guard to check if a string is a valid SizeValue
 * Uses explicit iteration to avoid type assertion
 */
function isSizeValue(value: string): value is SizeValue {
  for (const size of SIZE_ORDER) {
    if (size === value) {
      return true;
    }
  }
  return false;
}

/**
 * Compare PR size label with threshold
 * Returns true if appliedSize >= threshold
 *
 * @param appliedSize - Applied size label (e.g., "size/large" or "large")
 * @param threshold - Threshold size value (e.g., "medium")
 * @returns True if appliedSize >= threshold, false otherwise
 *
 * @example
 * compareSizeThreshold("size/large", "medium") // true
 * compareSizeThreshold("size/small", "medium") // false
 * compareSizeThreshold("size/medium", "medium") // true
 */
export function compareSizeThreshold(appliedSize: string, threshold: string): boolean {
  // Remove "size/" prefix if present
  const sizeValue = appliedSize.startsWith('size/') ? appliedSize.replace('size/', '') : appliedSize;

  // Validate size values using type guard
  if (!isSizeValue(sizeValue) || !isSizeValue(threshold)) {
    return false;
  }

  const appliedIndex = SIZE_ORDER.indexOf(sizeValue);
  const thresholdIndex = SIZE_ORDER.indexOf(threshold);

  return appliedIndex >= thresholdIndex;
}

/**
 * Calculate size category from total additions
 * Returns size label in "size/{category}" format
 *
 * @param totalAdditions - Total additions in PR
 * @param thresholds - Size thresholds configuration
 * @returns Size category label (e.g., "size/medium")
 *
 * @example
 * calculateSizeCategory(150, { small: 200, medium: 500, large: 1000, xlarge: 3000 }) // "size/small"
 * calculateSizeCategory(600, { small: 200, medium: 500, large: 1000, xlarge: 3000 }) // "size/medium"
 */
export function calculateSizeCategory(totalAdditions: number, thresholds: SizeThresholdsV2): string {
  return calculateSizeLabel(totalAdditions, thresholds);
}
