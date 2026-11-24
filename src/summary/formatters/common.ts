import { formatFileSize, formatNumber as formatNumberWithLocale } from '../../utils/formatting.js';

/**
 * Format bytes to human-readable string
 * @deprecated Use formatFileSize from utils/formatting.ts instead
 */
export function formatBytes(bytes: number): string {
  return formatFileSize(bytes);
}

/**
 * Format number with thousands separator
 * @deprecated Use formatNumberWithLocale from utils/formatting.ts instead
 */
export function formatNumber(value: number): string {
  return formatNumberWithLocale(value);
}

export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]`|])/g, '\\$1');
}
