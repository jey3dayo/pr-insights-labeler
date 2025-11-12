import { t } from '../../i18n.js';

/**
 * Format excluded files as a collapsible details block for Summary output.
 */
export function formatExcludedFiles(files: string[]): string {
  if (files.length === 0) {
    return '';
  }

  let output = '<details>\n';
  output += `<summary>${t('summary', 'basicMetrics.excludedFilesDetail', { count: files.length })}</summary>\n\n`;

  for (const file of files) {
    output += `- \`${file}\`\n`;
  }

  output += '\n</details>\n\n';
  return output;
}
