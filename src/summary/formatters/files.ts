import type { Violations } from '../../errors/index.js';
import { t } from '../../i18n.js';
import type { FileMetrics } from '../../types/analysis.js';
import { escapeMarkdown, formatBytes, formatNumber } from './common.js';

export function formatFileDetails(files: FileMetrics[], limit?: number): string {
  if (files.length === 0) {
    return '';
  }

  let output = '';
  output += `### 📈 ${t('summary', 'fileDetails.topLargeFiles')}\n\n`;
  output += `| ${t('summary', 'fileDetails.fileName')} | ${t('summary', 'fileDetails.size')} | ${t('summary', 'fileDetails.lines')} | ${t('summary', 'fileDetails.changes')} |\n`;
  output += '|------|------|-------|----------|\n';

  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const displayFiles = limit ? sortedFiles.slice(0, limit) : sortedFiles;

  for (const file of displayFiles) {
    const changes = `+${formatNumber(file.additions)}/-${formatNumber(file.deletions)}`;
    output += `| \`${file.path}\` | ${formatBytes(file.size)} | ${formatNumber(file.lines)} | ${changes} |\n`;
  }
  output += '\n';

  return output;
}

export function formatFileAnalysis(violations: Violations, files: FileMetrics[], limit: number = 10): string {
  if (files.length === 0) {
    return '';
  }

  let output = '';
  output += `### 📊 ${t('summary', 'fileAnalysis.title')}\n\n`;
  output += `| ${t('summary', 'fileDetails.fileName')} | ${t('summary', 'fileDetails.size')} | ${t('summary', 'fileDetails.lines')} | ${t('summary', 'fileDetails.changes')} | ${t('summary', 'fileDetails.status')} |\n`;
  output += '|------|------|-------|----------|----------|\n';

  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const displayFiles = limit ? sortedFiles.slice(0, limit) : sortedFiles;

  const lineViolationMap = new Map(violations.exceedsFileLines.map(v => [v.file, v]));
  const sizeViolationMap = new Map(violations.largeFiles.map(v => [v.file, v]));

  for (const file of displayFiles) {
    const changes = `+${formatNumber(file.additions)}/-${formatNumber(file.deletions)}`;

    let status = `✅ ${t('summary', 'fileAnalysis.status.ok')}`;
    const lineViolation = lineViolationMap.get(file.path);
    const sizeViolation = sizeViolationMap.get(file.path);

    if (lineViolation) {
      const icon = lineViolation.severity === 'critical' ? '🚫' : '⚠️';
      status = `${icon} ${t('summary', 'fileAnalysis.status.lineExceed', { limit: formatNumber(lineViolation.limit) })}`;
    } else if (sizeViolation) {
      const icon = sizeViolation.severity === 'critical' ? '🚫' : '⚠️';
      status = `${icon} ${t('summary', 'fileAnalysis.status.sizeExceed', { limit: formatBytes(sizeViolation.limit) })}`;
    }

    output += `| \`${file.path}\` | ${formatBytes(file.size)} | ${formatNumber(file.lines)} | ${changes} | ${status} |\n`;
  }
  output += '\n';

  return output;
}

export { escapeMarkdown };
