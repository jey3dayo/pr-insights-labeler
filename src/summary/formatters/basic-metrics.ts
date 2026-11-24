import { t } from '../../i18n.js';
import type { AnalysisResult } from '../../types/analysis.js';
import { formatNumber } from './common.js';

export interface FormatBasicMetricsOptions {
  includeHeader?: boolean;
  includeTimestamp?: boolean;
  filesAnalyzedLabel?: string;
}

interface CountLine {
  label: string;
  value: number;
}

interface RenderBasicMetricsOptions extends FormatBasicMetricsOptions {
  totalFilesLine?: CountLine;
  filesAnalyzedLine?: CountLine;
}

function renderBasicMetrics(metrics: AnalysisResult['metrics'], options: RenderBasicMetricsOptions): string {
  const { includeHeader = true, includeTimestamp = true, totalFilesLine, filesAnalyzedLine } = options;
  let output = '';

  if (includeHeader) {
    output += `### 📈 ${t('summary', 'basicMetrics.title')}`;
    output += '\n\n';
  }

  if (metrics.totalFiles === 0) {
    output += `**${t('summary', 'fileDetails.noFiles')}**\n\n`;
    return output;
  }

  output += `- ${t('summary', 'basicMetrics.totalAdditions')}: **${formatNumber(metrics.totalAdditions)}**\n`;
  output += `- ${t('summary', 'basicMetrics.excludedAdditions')}: **${formatNumber(metrics.excludedAdditions)}**\n`;

  if (totalFilesLine) {
    output += `- ${totalFilesLine.label}: **${formatNumber(totalFilesLine.value)}**\n`;
  }

  if (filesAnalyzedLine) {
    output += `- ${filesAnalyzedLine.label}: **${formatNumber(filesAnalyzedLine.value)}**\n`;
  }
  output += `- ${t('summary', 'basicMetrics.excludedFiles')}: **${metrics.filesExcluded.length}**\n`;
  output += `- ${t('summary', 'basicMetrics.binaryFilesSkipped')}: **${metrics.filesSkippedBinary.length}**\n`;

  if (metrics.filesWithErrors.length > 0) {
    output += `- ${t('summary', 'basicMetrics.filesWithErrors')}: **${metrics.filesWithErrors.length}** ⚠️\n`;
  }

  if (metrics.filesSkippedByLimit.length > 0) {
    output += `- ${t('summary', 'basicMetrics.filesSkippedByLimit')}: **${metrics.filesSkippedByLimit.length}** ⚠️\n`;
  }

  if (includeTimestamp) {
    const now = new Date();
    const dateStr = now
      .toISOString()
      .replace(/T/, ' ')
      .replace(/\.\d{3}Z$/, ' (UTC)');
    output += `- ${t('summary', 'basicMetrics.analysisTime')}: ${dateStr}\n`;
  }
  output += '\n';

  return output;
}

export function formatBasicMetrics(metrics: AnalysisResult['metrics'], options?: FormatBasicMetricsOptions): string {
  return renderBasicMetrics(metrics, {
    ...options,
    totalFilesLine: {
      label: options?.filesAnalyzedLabel ?? t('summary', 'basicMetrics.totalFiles'),
      value: metrics.filesAnalyzed.length,
    },
  });
}

export type FormatSummaryBasicMetricsOptions = FormatBasicMetricsOptions;

export function formatSummaryBasicMetrics(
  metrics: AnalysisResult['metrics'],
  options?: FormatSummaryBasicMetricsOptions,
): string {
  return renderBasicMetrics(metrics, {
    ...options,
    totalFilesLine: {
      label: t('summary', 'basicMetrics.totalFiles'),
      value: metrics.totalFiles,
    },
    filesAnalyzedLine: {
      label: t('summary', 'basicMetrics.filesAnalyzed'),
      value: metrics.filesAnalyzed.length,
    },
  });
}
