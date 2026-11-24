import { t } from '../../i18n.js';
import type { AnalysisResult } from '../../types/analysis.js';
import { formatNumber } from './common.js';

export interface FormatBasicMetricsOptions {
  includeHeader?: boolean;
  includeTimestamp?: boolean;
  filesAnalyzedLabel?: string;
}

interface RenderBasicMetricsOptions extends FormatBasicMetricsOptions {
  totalFilesLabel: string;
  totalFilesValue: number;
  filesAnalyzedLine?: {
    label: string;
    value: number;
  };
}

function renderBasicMetrics(metrics: AnalysisResult['metrics'], options: RenderBasicMetricsOptions): string {
  const {
    includeHeader = true,
    includeTimestamp = true,
    totalFilesLabel,
    totalFilesValue,
    filesAnalyzedLine,
  } = options;
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
  output += `- ${totalFilesLabel}: **${formatNumber(totalFilesValue)}**\n`;

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
    totalFilesLabel: options?.filesAnalyzedLabel ?? t('summary', 'basicMetrics.totalFiles'),
    totalFilesValue: metrics.filesAnalyzed.length,
  });
}

export type FormatSummaryBasicMetricsOptions = FormatBasicMetricsOptions;

export function formatSummaryBasicMetrics(
  metrics: AnalysisResult['metrics'],
  options?: FormatSummaryBasicMetricsOptions,
): string {
  return renderBasicMetrics(metrics, {
    ...options,
    totalFilesLabel: t('summary', 'basicMetrics.totalFiles'),
    totalFilesValue: metrics.totalFiles,
    filesAnalyzedLine: {
      label: t('summary', 'basicMetrics.filesAnalyzed'),
      value: metrics.filesAnalyzed.length,
    },
  });
}
