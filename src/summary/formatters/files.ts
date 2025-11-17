import type { Violations } from '../../errors/index.js';
import { t } from '../../i18n.js';
import type { FileMetrics } from '../../types/analysis.js';
import { escapeMarkdown, formatBytes, formatNumber } from './common.js';

interface FileTableColumn {
  header: string;
  render: (file: FileMetrics) => string;
}

function createBaseFileColumns(): FileTableColumn[] {
  return [
    {
      header: t('summary', 'fileDetails.fileName'),
      render: file => `\`${file.path}\``,
    },
    {
      header: t('summary', 'fileDetails.size'),
      render: file => formatBytes(file.size),
    },
    {
      header: t('summary', 'fileDetails.lines'),
      render: file => formatNumber(file.lines),
    },
    {
      header: t('summary', 'fileDetails.changes'),
      render: file => `+${formatNumber(file.additions)}/-${formatNumber(file.deletions)}`,
    },
  ];
}

function formatFileTable(heading: string, files: FileMetrics[], columns: FileTableColumn[], limit?: number): string {
  if (files.length === 0) {
    return '';
  }

  const sortedFiles = [...files].sort((a, b) => b.size - a.size);
  const displayFiles = limit ? sortedFiles.slice(0, limit) : sortedFiles;

  let output = '';
  output += `${heading}\n\n`;
  output += `| ${columns.map(column => column.header).join(' | ')} |\n`;
  output += `|${columns.map(() => '------').join('|')}|\n`;

  for (const file of displayFiles) {
    output += `| ${columns.map(column => column.render(file)).join(' | ')} |\n`;
  }
  output += '\n';

  return output;
}

export function formatFileDetails(files: FileMetrics[], limit?: number): string {
  return formatFileTable(`### 📈 ${t('summary', 'fileDetails.topLargeFiles')}`, files, createBaseFileColumns(), limit);
}

export function formatFileAnalysis(violations: Violations, files: FileMetrics[], limit: number = 10): string {
  const lineViolationMap = new Map(violations.exceedsFileLines.map(v => [v.file, v]));
  const sizeViolationMap = new Map(violations.largeFiles.map(v => [v.file, v]));

  const statusColumn: FileTableColumn = {
    header: t('summary', 'fileDetails.status'),
    render: file => {
      const lineViolation = lineViolationMap.get(file.path);
      const sizeViolation = sizeViolationMap.get(file.path);

      if (lineViolation) {
        const icon = lineViolation.severity === 'critical' ? '🚫' : '⚠️';
        return `${icon} ${t('summary', 'fileAnalysis.status.lineExceed', {
          limit: formatNumber(lineViolation.limit),
        })}`;
      }

      if (sizeViolation) {
        const icon = sizeViolation.severity === 'critical' ? '🚫' : '⚠️';
        return `${icon} ${t('summary', 'fileAnalysis.status.sizeExceed', {
          limit: formatBytes(sizeViolation.limit),
        })}`;
      }

      return `✅ ${t('summary', 'fileAnalysis.status.ok')}`;
    },
  };

  return formatFileTable(
    `### 📊 ${t('summary', 'fileAnalysis.title')}`,
    files,
    [...createBaseFileColumns(), statusColumn],
    limit,
  );
}

export { escapeMarkdown };
